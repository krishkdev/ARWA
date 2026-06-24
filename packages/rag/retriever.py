"""Query a FAISS index and return ranked chunks with relevance scores."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .embedder import embed_query
from .indexer import load_index


@dataclass
class RetrievedChunk:
    chunk_index: int
    document_id: str
    page_number: int
    text: str
    relevance_score: float  # 0–1 cosine similarity


def retrieve(
    query: str,
    doc_ids: list[str],
    store_dir: str,
    top_k: int = 5,
    api_key: str | None = None,
) -> list[RetrievedChunk]:
    """
    Embed the query, search across all requested document indexes,
    merge results, and return the global top-k by relevance score.
    """
    q_vec = embed_query(query, api_key=api_key)
    norm = np.linalg.norm(q_vec)
    if norm > 0:
        q_vec = q_vec / norm

    all_results: list[RetrievedChunk] = []

    for doc_id in doc_ids:
        try:
            index, manifest = load_index(doc_id, store_dir)
        except FileNotFoundError:
            continue

        k = min(top_k, index.ntotal)
        scores, indices = index.search(q_vec, k)

        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            chunk = manifest[idx]
            relevance = float(np.clip(score, 0.0, 1.0))
            all_results.append(
                RetrievedChunk(
                    chunk_index=chunk["chunk_index"],
                    document_id=doc_id,
                    page_number=chunk["page_number"],
                    text=chunk["text"],
                    relevance_score=relevance,
                )
            )

    all_results.sort(key=lambda r: r.relevance_score, reverse=True)
    return all_results[:top_k]
