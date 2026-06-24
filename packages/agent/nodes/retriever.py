"""RETRIEVE node — embed sub-questions and fetch top-k chunks from FAISS."""

from __future__ import annotations

import os
import time

from ..state import ARWAState, AgentTraceStep, RetrievedChunk

# Imported at call-time to avoid circular issues with sys.path
def _rag_retrieve(query, doc_ids, store_dir, top_k, api_key):
    from rag.retriever import retrieve
    return retrieve(query=query, doc_ids=doc_ids, store_dir=store_dir, top_k=top_k, api_key=api_key)


_TOP_K_FIRST = 5
_TOP_K_RETRY = 10   # wider net on second attempt


def run_retriever(state: ARWAState) -> dict:
    start = time.perf_counter()

    attempt = state.get("retrieval_attempt", 0)
    store_dir = os.environ.get("FAISS_INDEX_PATH", "../../data/vector_store")
    api_key = os.environ.get("OPENAI_API_KEY")
    doc_meta = state.get("document_meta", {})

    # On retry use the original query directly with a wider top-k
    if attempt == 0:
        queries = state.get("sub_questions") or [state["query"]]
        top_k = _TOP_K_FIRST
    else:
        queries = [state["query"]]
        top_k = _TOP_K_RETRY

    seen: set[tuple[str, int]] = set()
    merged: list[RetrievedChunk] = []

    for q in queries:
        results = _rag_retrieve(
            query=q,
            doc_ids=state["document_ids"],
            store_dir=store_dir,
            top_k=top_k,
            api_key=api_key,
        )
        for r in results:
            key = (r.document_id, r.chunk_index)
            if key in seen:
                continue
            seen.add(key)
            filename = doc_meta.get(r.document_id, {}).get("filename", r.document_id)
            merged.append(
                RetrievedChunk(
                    text=r.text,
                    document_id=r.document_id,
                    filename=filename,
                    page=r.page_number,
                    score=r.relevance_score,
                )
            )

    merged.sort(key=lambda c: c.score, reverse=True)
    top_chunks = merged[:top_k]

    confidence = top_chunks[0].score if top_chunks else 0.0
    avg_score = sum(c.score for c in top_chunks) / max(len(top_chunks), 1)
    elapsed_ms = int((time.perf_counter() - start) * 1000)

    step = AgentTraceStep(
        name="RETRIEVE",
        status="complete",
        description=(
            f"Fetched {len(top_chunks)} chunk(s) · confidence {confidence:.2f}"
            + (f" (retry {attempt})" if attempt > 0 else "")
        ),
        duration_ms=elapsed_ms,
        payload={"chunk_count": len(top_chunks), "avg_score": round(avg_score, 3), "attempt": attempt},
    )

    return {
        "retrieved_chunks": top_chunks,
        "retrieval_confidence": confidence,
        "retrieval_attempt": attempt + 1,
        "trace": list(state.get("trace", [])) + [step],
    }
