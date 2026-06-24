"""Extract raw text from a PDF file, page by page."""

from __future__ import annotations

import io
from dataclasses import dataclass

import PyPDF2


@dataclass
class PageText:
    page_number: int  # 1-indexed
    text: str


def extract_text(pdf_bytes: bytes) -> tuple[list[PageText], int]:
    """
    Parse a PDF from raw bytes.

    Returns:
        pages: list of PageText (one per page, skipping blank pages)
        page_count: total pages in the document
    """
    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)
    pages: list[PageText] = []

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            pages.append(PageText(page_number=i + 1, text=text))

    return pages, page_count
