"""PLAN node — decompose the query into a focused retrieval plan."""

from __future__ import annotations

import json
import time

from anthropic import Anthropic

from ..state import ARWAState, AgentTraceStep

_SYSTEM = (
    "You are a research assistant. Given a user query, create a focused plan to answer "
    "it from uploaded document(s). Keep the plan concise and the sub-questions specific."
)


def run_planner(state: ARWAState) -> dict:
    start = time.perf_counter()
    client = Anthropic()

    history_text = ""
    if state.get("conversation_history"):
        history_text = "\n\nPrior conversation:\n" + "\n".join(
            f"{m['role'].capitalize()}: {m['content']}"
            for m in state["conversation_history"][-4:]
        )

    prompt = (
        f"Query: {state['query']}{history_text}\n\n"
        "Return JSON only — no prose before or after:\n"
        "{\n"
        '  "plan": "1-2 sentence retrieval approach",\n'
        '  "sub_questions": ["specific question 1", "specific question 2"]\n'
        "}"
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    raw = response.content[0].text.strip()

    try:
        # Strip markdown code fences if the model wraps JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        plan = str(data.get("plan", state["query"]))
        sub_questions = [str(q) for q in data.get("sub_questions", [])] or [state["query"]]
    except (json.JSONDecodeError, KeyError, TypeError):
        plan = f"Search documents for: {state['query']}"
        sub_questions = [state["query"]]

    step = AgentTraceStep(
        name="PLAN",
        status="complete",
        description=plan[:150],
        duration_ms=elapsed_ms,
        payload={"sub_questions": sub_questions},
    )

    return {
        "plan": plan,
        "sub_questions": sub_questions,
        "trace": list(state.get("trace", [])) + [step],
    }
