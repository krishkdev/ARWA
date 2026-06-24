"""REASON node — synthesise an answer from retrieved context using Claude."""

from __future__ import annotations

import time

from anthropic import Anthropic

from ..state import ARWAState, AgentTraceStep

_SYSTEM = (
    "You are a research assistant that answers questions strictly from provided document excerpts. "
    "Ground every claim in the sources. Use **bold** for key terms and findings. "
    "Never fabricate information that is not present in the context. "
    "Write in clear, direct prose."
)


def run_reasoner(state: ARWAState) -> dict:
    start = time.perf_counter()
    client = Anthropic()

    chunks = state.get("retrieved_chunks", [])
    if not chunks:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        step = AgentTraceStep(
            name="REASON",
            status="error",
            description="No chunks retrieved — cannot answer",
            duration_ms=elapsed_ms,
            payload=None,
        )
        return {
            "answer": "I could not find relevant information in the uploaded documents to answer your question.",
            "reasoning_steps": ["No retrieved chunks available"],
            "trace": list(state.get("trace", [])) + [step],
        }

    context_parts = [
        f"[Source {i + 1}: {c.filename}, page {c.page}]\n{c.text}"
        for i, c in enumerate(chunks)
    ]
    context = "\n\n---\n\n".join(context_parts)

    messages: list[dict] = list(state.get("conversation_history", []))
    messages.append({
        "role": "user",
        "content": (
            f"Document excerpts:\n\n{context}\n\n"
            f"---\n\nQuestion: {state['query']}\n\n"
            "Answer using only the excerpts above. "
            "Cite sources inline as [Source N] where relevant."
        ),
    })

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=_SYSTEM,
        messages=messages,
    )

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    answer = response.content[0].text.strip()

    step = AgentTraceStep(
        name="REASON",
        status="complete",
        description=f"Synthesised answer from {len(chunks)} chunk(s)",
        duration_ms=elapsed_ms,
        payload={
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "chunks_used": len(chunks),
        },
    )

    return {
        "answer": answer,
        "reasoning_steps": [f"Synthesised from {len(chunks)} retrieved chunks"],
        "trace": list(state.get("trace", [])) + [step],
    }
