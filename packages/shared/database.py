"""ARWA persistent storage — SQLite via SQLAlchemy async + aiosqlite."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

_engine: AsyncEngine | None = None


def _get_engine() -> AsyncEngine:
    if _engine is None:
        raise RuntimeError("Database not initialised — call init_db() first")
    return _engine


async def init_db(db_path: str | Path) -> None:
    global _engine
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _engine = create_async_engine(
        f"sqlite+aiosqlite:///{db_path}",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with _engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS documents (
                id          TEXT PRIMARY KEY,
                filename    TEXT NOT NULL,
                page_count  INTEGER NOT NULL,
                chunk_count INTEGER NOT NULL,
                status      TEXT NOT NULL DEFAULT 'indexed',
                uploaded_at TEXT NOT NULL
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS messages (
                id                 TEXT PRIMARY KEY,
                conversation_id    TEXT NOT NULL,
                document_ids       TEXT NOT NULL,
                role               TEXT NOT NULL,
                content            TEXT NOT NULL,
                citations          TEXT,
                confidence         REAL,
                hallucination_risk TEXT,
                trace              TEXT,
                created_at         TEXT NOT NULL
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_messages_conv "
            "ON messages(conversation_id, created_at)"
        ))


async def close_db() -> None:
    if _engine:
        await _engine.dispose()


# ── Documents ─────────────────────────────────────────────────────────────────

async def upsert_document(
    doc_id: str,
    filename: str,
    page_count: int,
    chunk_count: int,
    status: str = "indexed",
    uploaded_at: str | None = None,
) -> None:
    ts = uploaded_at or datetime.now(timezone.utc).isoformat()
    async with _get_engine().begin() as conn:
        await conn.execute(
            text("""
                INSERT INTO documents (id, filename, page_count, chunk_count, status, uploaded_at)
                VALUES (:id, :fn, :pc, :cc, :st, :ua)
                ON CONFLICT(id) DO UPDATE SET
                    filename    = excluded.filename,
                    page_count  = excluded.page_count,
                    chunk_count = excluded.chunk_count,
                    status      = excluded.status
            """),
            {"id": doc_id, "fn": filename, "pc": page_count,
             "cc": chunk_count, "st": status, "ua": ts},
        )


async def get_all_documents() -> list[dict[str, Any]]:
    async with _get_engine().connect() as conn:
        result = await conn.execute(text(
            "SELECT id, filename, page_count, chunk_count, status, uploaded_at "
            "FROM documents ORDER BY uploaded_at DESC"
        ))
        rows = result.fetchall()
    return [
        {"document_id": r[0], "filename": r[1], "page_count": r[2],
         "chunk_count": r[3], "status": r[4], "uploaded_at": r[5]}
        for r in rows
    ]


async def get_document(doc_id: str) -> dict[str, Any] | None:
    async with _get_engine().connect() as conn:
        result = await conn.execute(
            text("SELECT id, filename, page_count, chunk_count, status, uploaded_at "
                 "FROM documents WHERE id = :id"),
            {"id": doc_id},
        )
        row = result.fetchone()
    if row is None:
        return None
    return {"document_id": row[0], "filename": row[1], "page_count": row[2],
            "chunk_count": row[3], "status": row[4], "uploaded_at": row[5]}


async def document_exists(doc_id: str) -> bool:
    return (await get_document(doc_id)) is not None


async def delete_document_row(doc_id: str) -> None:
    async with _get_engine().begin() as conn:
        await conn.execute(text("DELETE FROM documents WHERE id = :id"), {"id": doc_id})


# ── Messages ──────────────────────────────────────────────────────────────────

async def save_message(
    msg_id: str,
    conversation_id: str,
    document_ids: list[str],
    role: str,
    content: str,
    citations: list[dict] | None = None,
    confidence: float | None = None,
    hallucination_risk: str | None = None,
    trace: list[dict] | None = None,
) -> None:
    ts = datetime.now(timezone.utc).isoformat()
    async with _get_engine().begin() as conn:
        await conn.execute(
            text("""
                INSERT OR IGNORE INTO messages
                    (id, conversation_id, document_ids, role, content,
                     citations, confidence, hallucination_risk, trace, created_at)
                VALUES
                    (:id, :conv, :doc_ids, :role, :content,
                     :citations, :confidence, :risk, :trace, :ts)
            """),
            {
                "id": msg_id,
                "conv": conversation_id,
                "doc_ids": json.dumps(document_ids),
                "role": role,
                "content": content,
                "citations": json.dumps(citations) if citations is not None else None,
                "confidence": confidence,
                "risk": hallucination_risk,
                "trace": json.dumps(trace) if trace is not None else None,
                "ts": ts,
            },
        )


async def get_conversation_messages(conversation_id: str) -> list[dict[str, Any]]:
    async with _get_engine().connect() as conn:
        result = await conn.execute(
            text("""
                SELECT id, role, content, citations, confidence,
                       hallucination_risk, trace, created_at
                FROM messages
                WHERE conversation_id = :conv
                ORDER BY created_at ASC
            """),
            {"conv": conversation_id},
        )
        rows = result.fetchall()
    return [
        {
            "id": r[0],
            "role": r[1],
            "content": r[2],
            "citations": json.loads(r[3]) if r[3] else [],
            "confidence": r[4] or 0.0,
            "hallucination_risk": r[5] or "low",
            "trace": json.loads(r[6]) if r[6] else [],
            "created_at": r[7],
        }
        for r in rows
    ]
