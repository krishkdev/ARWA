"""Split extracted page text into overlapping token-bounded chunks."""

from __future__ import annotations

from dataclasses import dataclass

import tiktoken

from .ingestor import PageText

ENCODING = tiktoken.get_encoding("cl100k_base")  # compatible with text-embedding-3-large

CHUNK_TOKENS = 650   # target size (fits inside 500–800 spec range)
OVERLAP_TOKENS = 100


@dataclass
class Chunk:
    chunk_index: int   # global index across the whole document
    page_number: int   # source page (first page this chunk came from)
    text: str
    token_count: int


def _tokenize(text: str) -> list[int]:
    return ENCODING.encode(text)


def _decode(tokens: list[int]) -> str:
    return ENCODING.decode(tokens)


def chunk_text(pages: list[PageText]) -> list[Chunk]:
    """
    Merge all page text, then split into overlapping chunks of ~CHUNK_TOKENS.
    Each chunk records the page number where its first token originated.
    """
    # Build a flat token list with page-number annotations per token
    all_tokens: list[int] = []
    token_pages: list[int] = []  # which page each token came from

    for page in pages:
        toks = _tokenize(page.text + "\n")
        all_tokens.extend(toks)
        token_pages.extend([page.page_number] * len(toks))

    chunks: list[Chunk] = []
    start = 0
    idx = 0

    while start < len(all_tokens):
        end = min(start + CHUNK_TOKENS, len(all_tokens))
        chunk_tokens = all_tokens[start:end]
        chunk_text_str = _decode(chunk_tokens)
        page_num = token_pages[start]

        chunks.append(
            Chunk(
                chunk_index=idx,
                page_number=page_num,
                text=chunk_text_str,
                token_count=len(chunk_tokens),
            )
        )
        idx += 1
        # Advance by (chunk - overlap) so the next chunk begins with the tail
        advance = CHUNK_TOKENS - OVERLAP_TOKENS
        start += advance

    return chunks
