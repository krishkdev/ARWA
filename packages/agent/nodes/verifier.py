"""VERIFY node — assess hallucination risk and finalise citations."""

from __future__ import annotations

import json
import time

from anthropic import Anthropic

from ..state import ARWAState, AgentTraceStep, Citation

_SYSTEM = (
    "You are a rigorous fact-checker. Determine whether an answer is faithfully grounded "
    "in the provided source excerpts. Be conservative — mark as 'medium' or 'high' risk "
    "if the answer makes claims not clearly supported by the sources."
)


def run_verifier(state: ARWAState) -> dict:
    start = time.perf_counter()
    client = Anthropic()

    chunks = state.get("retrieved_chunks", [])
    answer = state.get("answer", "")

    if not chunks or not answer:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        step = AgentTraceStep(
            name="VERIFY",
            status="error",
            description="Nothing to verify",
            duration_ms=elapsed_ms,
            payload=None,
        )
        return {
            "citations": [],
            "hallucination_risk": "high",
            "retrieval_confidence": 0.0,
            "status": "complete",
            "trace": list(state.get("trace", [])) + [step],
        }

    chunks_text = "\n\n".join(
        f"[{i}] {c.filename} p.{c.page} (score {c.score:.2f}):\n{c.text[:400]}"
        for i, c in enumerate(chunks)
    )

    prompt = (
        f"Answer:\n{answer}\n\n"
        f"Source chunks:\n{chunks_text}\n\n"
        "Return JSON only:\n"
        "{\n"
        '  "hallucination_risk": "low" | "medium" | "high",\n'
        '  "confidence": 0.0–1.0,\n'
        '  "cited_chunk_indices": [0-based indices of chunks the answer actually draws from],\n'
        '  "reasoning": "one sentence"\n'
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
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        risk = str(data.get("hallucination_risk", "medium"))
        if risk not in ("low", "medium", "high"):
            risk = "medium"
        confidence = float(data.get("confidence", 0.7))
        confidence = max(0.0, min(1.0, confidence))
        cited_indices: list[int] = [int(i) for i in data.get("cited_chunk_indices", [])]
    except (json.JSONDecodeError, ValueError, TypeError):
        risk = "medium"
        confidence = 0.65
        cited_indices = list(range(min(3, len(chunks))))

    # Fall back to all chunks if verifier returned no indices
    if not cited_indices:
        cited_indices = list(range(min(3, len(chunks))))

    citations: list[Citation] = []
    for citation_num, chunk_idx in enumerate(cited_indices[:5], start=1):
        if not (0 <= chunk_idx < len(chunks)):
            continue
        c = chunks[chunk_idx]
        citations.append(
            Citation(
                index=citation_num,
                document_id=c.document_id,
                filename=c.filename,
                page=c.page,
                excerpt=c.text[:250].strip(),
                relevance_score=round(c.score, 3),
            )
        )

    step = AgentTraceStep(
        name="VERIFY",
        status="complete",
        description=f"Hallucination risk: {risk.upper()}",
        duration_ms=elapsed_ms,
        payload={
            "risk": risk,
            "confidence": round(confidence, 3),
            "citations_count": len(citations),
        },
    )

    return {
        "citations": citations,
        "hallucination_risk": risk,
        "retrieval_confidence": confidence,
        "status": "complete",
        "trace": list(state.get("trace", [])) + [step],
    }
