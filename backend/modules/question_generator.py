"""Question Generator — produces role-specific interview questions dynamically via Gemini."""
from __future__ import annotations

import asyncio
import uuid

from backend.config import llm_client as _client, LLM_MODEL

from backend.models.schemas import Category, Difficulty, QuestionOut


# Fixed category sequence across the 5 questions of a session.
# Ensures a mix of technical depth, system thinking, and soft skills.
_CATEGORY_SEQUENCE: list[Category] = [
    Category.technical,
    Category.technical,
    Category.system_design,
    Category.behavioural,
    Category.technical,
]

_QUESTION_PROMPT = """\
You are a senior technical interviewer hiring for a {role} role.
Generate a single {difficulty} {category} interview question relevant to: {focus_sample}.

Rules:
- The question must be specific — avoid generic questions like "Tell me about yourself"
- Ask ONE focused question only — no multi-part compound questions
- Keep the question under 40 words
- technical: test a single concrete concept, API, or language feature
- system_design: describe ONE real-world system to design, scale, or debug
- behavioural: use situation-based framing (STAR method)
- Return ONLY the question text. No numbering, no preamble, no label.
{avoid_block}\
"""


async def generate_question(
    role: str,
    focus_areas: list[str],
    difficulty: Difficulty,
    asked_questions: list[str],
    question_index: int,
) -> QuestionOut:
    """Generate a single interview question tailored to the candidate.

    Args:
        role:             inferred job role, e.g. "Backend Engineer"
        focus_areas:      topic areas from role inference (used to pick a relevant angle)
        difficulty:       easy | medium | hard
        asked_questions:  texts of questions already asked this session (avoids repeats)
        question_index:   0-based index into the session (drives category selection)

    Returns a QuestionOut with a fresh UUID, ready to store and send to the frontend.
    """
    category = _CATEGORY_SEQUENCE[min(question_index, len(_CATEGORY_SEQUENCE) - 1)]
    focus_sample = ", ".join(focus_areas[:3]) if focus_areas else role

    avoid_block = ""
    if asked_questions:
        lines = "\n".join(f"- {q}" for q in asked_questions)
        avoid_block = f"\nDo NOT ask any of these questions:\n{lines}"

    prompt = _QUESTION_PROMPT.format(
        role=role,
        difficulty=difficulty.value,
        category=category.value,
        focus_sample=focus_sample,
        avoid_block=avoid_block,
    )

    response = await _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    question_text = response.choices[0].message.content.strip().strip('"').strip("'")

    return QuestionOut(
        id=str(uuid.uuid4()),
        text=question_text,
        category=category,
        difficulty=difficulty,
    )


def adapt_difficulty(current: Difficulty, last_technical_score: float) -> Difficulty:
    """Adjust question difficulty based on the candidate's last technical score.

    Rules:
        score > 0.75 → bump up one level (capped at hard)
        score < 0.40 → drop down one level (capped at easy)
        otherwise    → keep current difficulty

    Args:
        current:              difficulty of the question just answered
        last_technical_score: technical_score from technical_evaluator (0–1)

    Returns the new Difficulty level for the next question.
    """
    levels = [Difficulty.easy, Difficulty.medium, Difficulty.hard]
    idx = levels.index(current)
    if last_technical_score > 0.75 and idx < len(levels) - 1:
        return levels[idx + 1]
    if last_technical_score < 0.40 and idx > 0:
        return levels[idx - 1]
    return current


if __name__ == "__main__":
    q = asyncio.run(
        generate_question(
            role="Backend Engineer",
            focus_areas=["REST API design", "PostgreSQL optimisation", "Docker networking"],
            difficulty=Difficulty.medium,
            asked_questions=[],
            question_index=0,
        )
    )
    print(q.model_dump_json(indent=2))
