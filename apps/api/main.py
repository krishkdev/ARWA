"""ARWA FastAPI backend — /api/v1/ routes."""

from __future__ import annotations

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

# Make packages/ importable when running from apps/api/
_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_ROOT / "packages"))

from rag.ingestor import extract_text        # noqa: E402
from rag.chunker import chunk_text          # noqa: E402
from rag.embedder import embed_chunks       # noqa: E402
from rag.indexer import build_index         # noqa: E402

# ── Config ──────────────────────────────────────────────────────────────────

STORE_DIR = os.environ.get(
    "FAISS_INDEX_PATH",
    str(_ROOT / "data" / "vector_store"),
)
METADATA_FILE = os.environ.get(
    "METADATA_PATH",
    str(_ROOT / "data" / "documents.json"),
)
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB

# ── Metadata helpers ─────────────────────────────────────────────────────────

def _load_meta() -> dict[str, Any]:
    p = Path(METADATA_FILE)
    if not p.exists():
        return {}
    return json.loads(p.read_text())


def _save_meta(data: dict[str, Any]) -> None:
    p = Path(METADATA_FILE)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False))


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="ARWA API", version="0.1.0")

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
    status: str  # "indexed" | "processing" | "failed"


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


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float
    hallucination_risk: str
    trace: list[AgentTraceStep]
    conversation_id: str


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

    # ── Ingestion pipeline ───────────────────────────────────────────────────
    pages, page_count = extract_text(pdf_bytes)
    if not pages:
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    chunks = chunk_text(pages)

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    embeddings = embed_chunks(chunks, api_key=openai_key)
    build_index(doc_id, chunks, embeddings, STORE_DIR)

    # ── Persist metadata ─────────────────────────────────────────────────────
    meta = _load_meta()
    meta[doc_id] = {
        "document_id": doc_id,
        "filename": filename,
        "page_count": page_count,
        "chunk_count": len(chunks),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "status": "indexed",
    }
    _save_meta(meta)

    return UploadResponse(
        document_id=doc_id,
        filename=filename,
        page_count=page_count,
        chunk_count=len(chunks),
        status="indexed",
    )


@app.get("/api/v1/documents", response_model=list[DocumentMeta])
def list_documents():
    meta = _load_meta()
    return [DocumentMeta(**v) for v in meta.values()]


@app.get("/api/v1/documents/{doc_id}", response_model=DocumentMeta)
def get_document(doc_id: str):
    meta = _load_meta()
    if doc_id not in meta:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentMeta(**meta[doc_id])


@app.delete("/api/v1/documents/{doc_id}")
def delete_document(doc_id: str):
    meta = _load_meta()
    if doc_id not in meta:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove FAISS index files
    for ext in (".faiss", ".json"):
        p = Path(STORE_DIR) / f"{doc_id}{ext}"
        if p.exists():
            p.unlink()

    del meta[doc_id]
    _save_meta(meta)
    return {"deleted": doc_id}


@app.post("/api/v1/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Stub — returns mock data. Real agent wired in Session 3."""
    conversation_id = req.conversation_id or str(uuid.uuid4())
    meta = _load_meta()

    # Build mock citations from the first requested document we know about
    citations: list[Citation] = []
    for i, doc_id in enumerate(req.document_ids[:3], start=1):
        if doc_id in meta:
            doc = meta[doc_id]
            citations.append(
                Citation(
                    index=i,
                    document_id=doc_id,
                    filename=doc["filename"],
                    page=1,
                    excerpt=f"(Mock excerpt {i} from {doc['filename']})",
                    relevance_score=round(0.95 - i * 0.1, 2),
                )
            )

    trace = [
        AgentTraceStep(name="PLAN",     status="complete", description="Decomposing query into sub-questions", duration_ms=21),
        AgentTraceStep(name="RETRIEVE", status="complete", description=f"Fetching top-5 chunks across {len(req.document_ids)} document(s)", duration_ms=138),
        AgentTraceStep(name="REASON",   status="complete", description="Synthesising answer from retrieved context", duration_ms=84),
        AgentTraceStep(name="TOOL",     status="pending",  description="No tool calls required", duration_ms=None),
        AgentTraceStep(name="VERIFY",   status="complete", description="Hallucination risk: LOW", duration_ms=31),
    ]

    return ChatResponse(
        answer=f'(Mock) You asked: "{req.query}". Real agent coming in Session 3.',
        citations=citations,
        confidence=0.82,
        hallucination_risk="low",
        trace=trace,
        conversation_id=conversation_id,
    )


@app.get("/api/v1/chat/{conversation_id}")
def get_conversation(conversation_id: str):
    """Stub — in-memory conversations are not persisted yet."""
    return {"conversation_id": conversation_id, "messages": []}
