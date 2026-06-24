"""Generate embeddings for text chunks using OpenAI text-embedding-3-large."""

from __future__ import annotations

import os
from typing import Sequence

import numpy as np
from openai import OpenAI

from .chunker import Chunk

MODEL = "text-embedding-3-large"
BATCH_SIZE = 100  # OpenAI allows up to 2048 inputs per request; 100 is safe


def embed_chunks(chunks: Sequence[Chunk], api_key: str | None = None) -> np.ndarray:
    """
    Embed each chunk's text.

    Returns:
        ndarray of shape (n_chunks, embedding_dim)  — float32
    """
    client = OpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
    texts = [c.text for c in chunks]
    vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.embeddings.create(model=MODEL, input=batch)
        # Response items are ordered to match input order
        vectors.extend([item.embedding for item in response.data])

    return np.array(vectors, dtype=np.float32)


def embed_query(query: str, api_key: str | None = None) -> np.ndarray:
    """Embed a single query string. Returns shape (1, embedding_dim)."""
    client = OpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
    response = client.embeddings.create(model=MODEL, input=[query])
    vec = response.data[0].embedding
    return np.array([vec], dtype=np.float32)
