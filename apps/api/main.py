"""ARWA FastAPI backend — /api/v1/ routes."""

from __future__ import annotations

import asyncio
import json
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, AsyncGenerator

from anthropic import AsyncAnthropic
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

# Make packages/ importable when running from apps/api/
_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT / "packages"))

from rag.ingestor import extract_text        # noqa: E402
from rag.chunker import chunk_text          # noqa: E402
from rag.embedder import embed_chunks       # noqa: E402
from rag.indexer import build_index         # noqa: E402
from agent.nodes import (                   # noqa: E402
    run_planner,
    run_retriever,
    run_tool_executor,
    run_verifier,
)
from agent.state import ARWAState           # noqa: E402
from agent.state import AgentTraceStep as TraceStepDC  # noqa: E402
import shared.database as db               # noqa: E402

# ── Config ────────────────────────────────────────────────────────────────────

STORE_DIR = os.environ.get(
    "FAISS_INDEX_PATH",
    str(_ROOT / "data" / "vector_store"),
)
OLD_METADATA_FILE = str(_ROOT / "data" / "documents.json")
DB_PATH = str(_ROOT / "data" / "arwa.db")
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


# ── FAISS index recovery ──────────────────────────────────────────────────────

async def _recover_indexes() -> None:
    """
    On startup, scan the vector store for .faiss files.
    For each one not already in the DB, create a row using
    the old documents.json as the metadata source.
    """
    store_path = Path(STORE_DIR)
    if not store_path.exists():
        return

    # Load legacy metadata file if it exists
    old_meta: dict[str, Any] = {}
    old_meta_path = Path(OLD_METADATA_FILE)
    if old_meta_path.exists():
        try:
            old_meta = json.loads(old_meta_path.read_text())
        except Exception:
            pass

    for faiss_file in store_path.glob("*.faiss"):
        doc_id = faiss_file.stem
        if await db.document_exists(doc_id):
            continue

        if doc_id in old_meta:
            m = old_meta[doc_id]
            await db.upsert_document(
                doc_id=doc_id,
                filename=m.get("filename", f"{doc_id}.pdf"),
                page_count=m.get("page_count", 0),
                chunk_count=m.get("chunk_count", 0),
                status=m.get("status", "indexed"),
                uploaded_at=m.get("uploaded_at"),
            )
        else:
            # Count chunks from manifest as best-effort metadata
            manifest_file = store_path / f"{doc_id}.json"
            chunk_count = 0
            if manifest_file.exists():
                try:
                    chunk_count = len(json.loads(manifest_file.read_text()))
                except Exception:
                    pass
            await db.upsert_document(
                doc_id=doc_id,
                filename=f"document-{doc_id[:8]}.pdf",
                page_count=0,
                chunk_count=chunk_count,
                status="indexed",
            )


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI):
    await db.init_db(DB_PATH)
    await _recover_indexes()
    yield
    await db.close_db()


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="ARWA API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic models ───────────────────────────────────────────────────────────

class DocumentMeta(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    uploaded_at: str
    status: str


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    page_count: int
    chunk_count: int
    status: str


class Citation(BaseModel):
    index: int
    document_id: str
    filename: str
    page: int
    excerpt: str
    relevance_score: float


class AgentTraceStep(BaseModel):
    name: str
    status: str
    description: str
    duration_ms: int | None
    payload: dict | None = None


class ChatRequest(BaseModel):
    query: str
    document_ids: list[str]
    conversation_id: str | None = None


class StoredMessage(BaseModel):
    id: str
    role: str
    content: str
    citations: list[dict] = []
    confidence: float = 0.0
    hallucination_risk: str = "low"
    trace: list[dict] = []
    created_at: str


class ConversationResponse(BaseModel):
    conversation_id: str
    messages: list[StoredMessage]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _trace_dc_to_dict(s: TraceStepDC) -> dict:
    return {
        "name": s.name,
        "status": s.status,
        "description": s.description,
        "duration_ms": s.duration_ms,
        "payload": s.payload,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/documents/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File exceeds 50 MB limit.")
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    doc_id = str(uuid.uuid4())
    filename = file.filename

    pages, page_count = extract_text(pdf_bytes)
    if not pages:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    chunks = chunk_text(pages)

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    embeddings = embed_chunks(chunks, api_key=openai_key)
    build_index(doc_id, chunks, embeddings, STORE_DIR)

    uploaded_at = datetime.now(timezone.utc).isoformat()
    await db.upsert_document(
        doc_id=doc_id,
        filename=filename,
        page_count=page_count,
        chunk_count=len(chunks),
        status="indexed",
        uploaded_at=uploaded_at,
    )

    return UploadResponse(
        document_id=doc_id,
        filename=filename,
        page_count=page_count,
        chunk_count=len(chunks),
        status="indexed",
    )


@app.get("/api/v1/documents", response_model=list[DocumentMeta])
async def list_documents():
    rows = await db.get_all_documents()
    return [DocumentMeta(**r) for r in rows]


@app.get("/api/v1/documents/{doc_id}", response_model=DocumentMeta)
async def get_document(doc_id: str):
    row = await db.get_document(doc_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentMeta(**row)


@app.delete("/api/v1/documents/{doc_id}")
async def delete_document(doc_id: str):
    row = await db.get_document(doc_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found.")

    for ext in (".faiss", ".json"):
        p = Path(STORE_DIR) / f"{doc_id}{ext}"
        if p.exists():
            p.unlink()

    await db.delete_document_row(doc_id)
    return {"deleted": doc_id}


@app.post("/api/v1/chat")
async def chat(req: ChatRequest):
    if not req.document_ids:
        raise HTTPException(status_code=400, detail="At least one document_id is required.")

    all_docs = await db.get_all_documents()
    meta = {d["document_id"]: d for d in all_docs}

    missing = [d for d in req.document_ids if d not in meta]
    if missing:
        raise HTTPException(status_code=404, detail=f"Documents not found: {missing}")

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    if not anthropic_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured.")

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    # Conversation is keyed by the primary document (first in list) when none given
    conversation_id = req.conversation_id or req.document_ids[0]

    # Persist user message immediately so it survives if the stream is interrupted
    user_msg_id = str(uuid.uuid4())
    await db.save_message(
        msg_id=user_msg_id,
        conversation_id=conversation_id,
        document_ids=req.document_ids,
        role="user",
        content=req.query,
    )

    async def generate() -> AsyncGenerator[str, None]:
        import time

        state: ARWAState = {
            "query": req.query,
            "document_ids": req.document_ids,
            "document_meta": meta,
            "conversation_history": [],
            "plan": "",
            "sub_questions": [],
            "retrieved_chunks": [],
            "retrieval_confidence": 0.0,
            "retrieval_attempt": 0,
            "reasoning_steps": [],
            "answer": "",
            "tool_calls": [],
            "tool_iterations": 0,
            "citations": [],
            "hallucination_risk": "medium",
            "trace": [],
            "status": "running",
            "error": None,
        }

        try:
            def apply(s: ARWAState, update: dict) -> ARWAState:
                return {**s, **update}  # type: ignore[return-value]

            # ── PLAN ────────────────────────────────────────────────────────
            state = apply(state, await asyncio.to_thread(run_planner, state))
            plan_step = state["trace"][-1] if state["trace"] else None
            if plan_step:
                yield _sse({"type": "trace", "step": _trace_dc_to_dict(plan_step)})

            # ── RETRIEVE ────────────────────────────────────────────────────
            for _attempt in range(2):
                state = apply(state, await asyncio.to_thread(run_retriever, state))
                ret_step = state["trace"][-1] if state["trace"] else None
                if ret_step:
                    yield _sse({"type": "trace", "step": _trace_dc_to_dict(ret_step)})
                if state.get("retrieval_confidence", 0.0) >= 0.4:
                    break

            # ── REASON (streaming) ───────────────────────────────────────────
            chunks = state.get("retrieved_chunks", [])
            context_parts: list[str] = []
            for i, ch in enumerate(chunks[:8]):
                page = getattr(ch, "page", "?")
                fname = meta.get(getattr(ch, "document_id", ""), {}).get("filename", "document")
                context_parts.append(f"[{i+1}] {fname} p.{page}:\n{ch.text}")
            context_block = "\n\n".join(context_parts) or "No relevant context found."

            system_prompt = (
                "You are ARWA, a grounded research assistant. "
                "Answer the user's question using only the provided context. "
                "Be concise and accurate. "
                "If the context does not contain the answer, say so honestly."
            )
            user_msg_content = f"Context:\n{context_block}\n\nQuestion: {req.query}"

            t_reason = time.monotonic()
            full_answer = ""
            async_client = AsyncAnthropic(api_key=anthropic_key)
            async with async_client.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=2048,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg_content}],
            ) as stream:
                async for delta in stream.text_stream:
                    full_answer += delta
                    yield _sse({"type": "text", "delta": delta})

            reason_ms = int((time.monotonic() - t_reason) * 1000)
            reason_step: TraceStepDC = TraceStepDC(
                name="REASON",
                status="complete",
                description=f"Generated answer · {len(full_answer)} chars",
                duration_ms=reason_ms,
                payload=None,
            )
            state = apply(state, {
                "answer": full_answer,
                "trace": list(state["trace"]) + [reason_step],
            })
            yield _sse({"type": "trace", "step": _trace_dc_to_dict(reason_step)})

            # ── TOOL ────────────────────────────────────────────────────────
            state = apply(state, await asyncio.to_thread(run_tool_executor, state))
            tool_step = state["trace"][-1] if state["trace"] else None
            if tool_step:
                yield _sse({"type": "trace", "step": _trace_dc_to_dict(tool_step)})

            # ── VERIFY ──────────────────────────────────────────────────────
            state = apply(state, await asyncio.to_thread(run_verifier, state))
            verify_step = state["trace"][-1] if state["trace"] else None
            if verify_step:
                yield _sse({"type": "trace", "step": _trace_dc_to_dict(verify_step)})

            # ── Serialise for DONE event ─────────────────────────────────────
            citations_raw = state.get("citations", [])
            citations_out = [
                {
                    "index": c.index,
                    "document_id": c.document_id,
                    "filename": c.filename,
                    "page": c.page,
                    "excerpt": c.excerpt,
                    "relevance_score": c.relevance_score,
                }
                for c in citations_raw
            ]
            trace_out = [_trace_dc_to_dict(s) for s in state.get("trace", [])]
            final_confidence = float(state.get("retrieval_confidence", 0.0))
            final_risk = state.get("hallucination_risk", "medium")
            final_answer = state.get("answer", "")

            # Persist assistant message
            asst_msg_id = str(uuid.uuid4())
            await db.save_message(
                msg_id=asst_msg_id,
                conversation_id=conversation_id,
                document_ids=req.document_ids,
                role="assistant",
                content=final_answer,
                citations=citations_out,
                confidence=final_confidence,
                hallucination_risk=final_risk,
                trace=trace_out,
            )

            yield _sse({
                "type": "done",
                "answer": final_answer,
                "citations": citations_out,
                "confidence": final_confidence,
                "hallucination_risk": final_risk,
                "trace": trace_out,
                "conversation_id": conversation_id,
            })
            yield "data: [DONE]\n\n"

        except Exception as exc:
            yield _sse({"type": "error", "message": str(exc)})
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/v1/chat/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str):
    messages = await db.get_conversation_messages(conversation_id)
    return ConversationResponse(
        conversation_id=conversation_id,
        messages=[StoredMessage(**m) for m in messages],
    )
