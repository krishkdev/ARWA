"""TOOL node — stub executor (no tools wired for MVP)."""

from __future__ import annotations

from ..state import ARWAState, AgentTraceStep


def run_tool_executor(state: ARWAState) -> dict:
    step = AgentTraceStep(
        name="TOOL",
        status="pending",
        description="No tool calls required",
        duration_ms=None,
        payload=None,
    )

    return {
        "tool_calls": [],
        "tool_iterations": state.get("tool_iterations", 0),
        "trace": list(state.get("trace", [])) + [step],
    }
