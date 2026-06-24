"""Persist and load FAISS flat-L2 indexes with chunk metadata."""

from __future__ import annotations

import json
import os
from pathlib import Path

import faiss
import numpy as np

from .chunker import Chunk


def _index_path(store_dir: str, doc_id: str) -> tuple[Path, Path]:
    d = Path(store_dir)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{doc_id}.faiss", d / f"{doc_id}.json"


def build_index(
    doc_id: str,
    chunks: list[Chunk],
    embeddings: np.ndarray,
    store_dir: str,
) -> None:
    """
    Build a flat inner-product FAISS index (cosine sim via normalized vectors)
    and save it alongside a JSON chunk manifest.
    """
    # Normalize so inner-product == cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1e-10, norms)
    normed = embeddings / norms

    dim = normed.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(normed)

    idx_path, meta_path = _index_path(store_dir, doc_id)
    faiss.write_index(index, str(idx_path))

    manifest = [
        {
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "text": c.text,
            "token_count": c.token_count,
        }
        for c in chunks
    ]
    meta_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))


def load_index(doc_id: str, store_dir: str) -> tuple[faiss.IndexFlatIP, list[dict]]:
    """Load FAISS index + chunk manifest for a document."""
    idx_path, meta_path = _index_path(store_dir, doc_id)
    if not idx_path.exists():
        raise FileNotFoundError(f"No index for document {doc_id}")
    index = faiss.read_index(str(idx_path))
    manifest = json.loads(meta_path.read_text())
    return index, manifest
