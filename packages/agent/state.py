"""ARWA agent state schema."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, TypedDict


@dataclass
class RetrievedChunk:
    text: str
    document_id: str
    filename: str
    page: int
    score: float


@dataclass
class Citation:
    index: int
    document_id: str
    filename: str
    page: int
    excerpt: str
    relevance_score: float


@dataclass
class ToolCall:
    tool: str
    input: dict
    output: dict


@dataclass
class AgentTraceStep:
    name: str          # PLAN | RETRIEVE | REASON | TOOL | VERIFY
    status: str        # complete | active | pending | error
    description: str
    duration_ms: Optional[int]
    payload: Optional[dict]


class ARWAState(TypedDict):
    # ── Inputs ────────────────────────────────────────────────────────────────
    query: str
    document_ids: list[str]
    document_meta: dict          # {doc_id: {filename, page_count, ...}}
    conversation_history: list[dict]

    # ── Planner ───────────────────────────────────────────────────────────────
    plan: str
    sub_questions: list[str]

    # ── Retriever ─────────────────────────────────────────────────────────────
    retrieved_chunks: list[RetrievedChunk]
    retrieval_confidence: float
    retrieval_attempt: int       # tracks retries (max 1 retry)

    # ── Reasoner ──────────────────────────────────────────────────────────────
    reasoning_steps: list[str]
    answer: str

    # ── Tool executor ─────────────────────────────────────────────────────────
    tool_calls: list[ToolCall]
    tool_iterations: int

    # ── Verifier ──────────────────────────────────────────────────────────────
    citations: list[Citation]
    hallucination_risk: str      # low | medium | high

    # ── Lifecycle ─────────────────────────────────────────────────────────────
    trace: list[AgentTraceStep]
    status: str
    error: Optional[str]
