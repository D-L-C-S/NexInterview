"""Technical Evaluation Engine — scores candidate answers using Gemini semantic analysis."""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass

from backend.config import llm_client as _client, LLM_MODEL



_EVAL_PROMPT = """\
You are evaluating a {difficulty} interview answer for a {role} position.

Question: {question}
Candidate's answer: {answer}

Score this answer and return a JSON object with:
  technical_score  (float 0.0–1.0) — factual correctness and technical accuracy
  depth_score      (float 0.0–1.0) — depth of knowledge, use of examples, clarity of explanation
  feedback_snippet (str)           — one specific, actionable coaching sentence

Scoring guide:
  1.0 — expert-level, complete answer with strong examples and edge cases
  0.7 — solid answer, correct but lacks depth or misses edge cases
  0.5 — partial: some correct points but significant gaps
  0.3 — mostly incorrect or very surface-level
  0.0 — completely wrong, off-topic, or no answer

Return only valid JSON. No markdown, no preamble.\
"""


@dataclass
class EvalResult:
    """Scores and one-line coaching note for a single evaluated answer."""

    technical_score: float   # 0–1: correctness and accuracy
    depth_score: float       # 0–1: depth, examples, clarity
    feedback_snippet: str    # actionable one-sentence coaching note


def _strip_fences(text: str) -> str:
    """Remove accidental markdown code fences from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


async def evaluate_answer(
    question: str,
    answer_text: str,
    role: str,
    difficulty: str = "medium",
) -> EvalResult:
    """Evaluate a candidate's answer and return numeric scores plus a coaching note.

    Args:
        question:    the exact question that was asked
        answer_text: the candidate's verbatim answer
        role:        inferred job role for scoring context (e.g. "Backend Engineer")
        difficulty:  easy | medium | hard — calibrates score expectations

    Returns an EvalResult with technical_score, depth_score, and feedback_snippet.

    Raises:
        RuntimeError: if Gemini returns unparseable JSON
    """
    prompt = _EVAL_PROMPT.format(
        difficulty=difficulty,
        role=role,
        question=question,
        answer=answer_text or "(no answer provided)",
    )

    response = await _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    text = _strip_fences(response.choices[0].message.content)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON: {exc}\nRaw response (first 300 chars): {text[:300]}"
        ) from exc

    return EvalResult(
        technical_score=float(max(0.0, min(1.0, data.get("technical_score", 0.5)))),
        depth_score=float(max(0.0, min(1.0, data.get("depth_score", 0.5)))),
        feedback_snippet=data.get("feedback_snippet", "Keep practising — review the fundamentals."),
    )


if __name__ == "__main__":
    result = asyncio.run(
        evaluate_answer(
            question="How does Redis handle cache eviction when memory is full?",
            answer_text=(
                "Redis uses LRU by default. You set maxmemory and a policy like "
                "allkeys-lru. When memory is full it evicts the least recently used key."
            ),
            role="Backend Engineer",
            difficulty="medium",
        )
    )
    print(result)
