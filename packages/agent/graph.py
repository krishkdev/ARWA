"""ARWA LangGraph agent — PLAN → RETRIEVE → REASON → TOOL → VERIFY."""

from __future__ import annotations

import os
from typing import Any

from langgraph.graph import END, StateGraph

from .nodes import (
    run_planner,
    run_reasoner,
    run_retriever,
    run_tool_executor,
    run_verifier,
)
from .state import ARWAState, Citation, AgentTraceStep


# ── Routing functions ─────────────────────────────────────────────────────────

def _route_after_retrieval(state: ARWAState) -> str:
    """Retry once with a wider search if confidence is below threshold."""
    confidence = state.get("retrieval_confidence", 0.0)
    attempt = state.get("retrieval_attempt", 0)
    # attempt is incremented by the retriever before we see it here,
    # so attempt == 1 means we just finished the first retrieval.
    if confidence < 0.4 and attempt < 2:
        return "retry"
    return "continue"


def _route_after_tools(state: ARWAState) -> str:
    """Loop back to retriever if tools were called and iterations remain."""
    tool_calls = state.get("tool_calls", [])
    iterations = state.get("tool_iterations", 0)
    if tool_calls and iterations < 3:
        return "retrieve"
    return "verify"


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    workflow = StateGraph(ARWAState)

    workflow.add_node("planner", run_planner)
    workflow.add_node("retriever", run_retriever)
    workflow.add_node("reasoner", run_reasoner)
    workflow.add_node("tool_executor", run_tool_executor)
    workflow.add_node("verifier", run_verifier)

    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "retriever")

    workflow.add_conditional_edges(
        "retriever",
        _route_after_retrieval,
        {
            "retry": "retriever",   # low-confidence retry (once)
            "continue": "reasoner",
        },
    )

    workflow.add_edge("reasoner", "tool_executor")

    workflow.add_conditional_edges(
        "tool_executor",
        _route_after_tools,
        {
            "retrieve": "retriever",  # tool-driven retrieval loop (stub never fires)
            "verify": "verifier",
        },
    )

    workflow.add_edge("verifier", END)

    return workflow.compile()


# ── Public entry point ────────────────────────────────────────────────────────

_graph = None  # module-level singleton compiled once


def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def run_agent(
    query: str,
    document_ids: list[str],
    document_meta: dict[str, Any],
    conversation_history: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Run the full ARWA agent pipeline and return the final state.

    Returns a dict with: answer, citations, confidence, hallucination_risk, trace
    """
    initial_state: ARWAState = {
        "query": query,
        "document_ids": document_ids,
        "document_meta": document_meta,
        "conversation_history": conversation_history or [],
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

    graph = _get_graph()
    final_state: ARWAState = graph.invoke(initial_state)
    return final_state
