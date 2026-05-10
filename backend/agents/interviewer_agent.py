"""Interviewer Agent — autonomously decides what question to ask next.

Unlike a simple rule-based approach, this agent:
  1. Reads the full session memory (all past Q&A, scores, patterns)
  2. Reasons about what topic area to probe next
  3. Decides difficulty based on candidate trajectory (not just last score)
  4. Generates a contextually appropriate question
  5. Records its reasoning in shared memory
"""
from __future__ import annotations

import uuid

from backend.agents.base_agent import BaseAgent
from backend.agents.session_memory import (
    InterviewerDecision,
    SessionMemory,
)
from backend.models.schemas import Category, Difficulty, QuestionOut


class InterviewerAgent(BaseAgent):
    """Agent that reasons about and generates interview questions."""

    @property
    def agent_name(self) -> str:
        return "InterviewerAgent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are an expert technical interviewer. You analyse the candidate's "
            "performance across all previous questions to decide what to ask next. "
            "You consider their strengths, weaknesses, trajectory, and the topics "
            "already covered. You make nuanced decisions — not just simple rules."
        )

    async def decide_next_question(
        self,
        memory: SessionMemory,
        question_index: int,
    ) -> QuestionOut:
        """Reason about and generate the next interview question.

        Agent loop:
          1. THINK — analyse session memory, identify what to probe next
          2. ACT   — generate the actual question via LLM
          3. OBSERVE — record the decision and reasoning in memory

        Args:
            memory:         shared session memory with full Q&A history
            question_index: 0-based index of the question to generate

        Returns a QuestionOut ready to store and send to the frontend.
        """
        # ── THINK: reason about what to ask ───────────────────────────────
        decision = await self.reason_json(
            f"""Given this interview session context, decide what to ask next.

Session context:
{memory.to_context_string()}

This will be question #{question_index + 1} of 5.

Reason step by step:
1. What topics have already been covered?
2. Where is the candidate strong vs weak?
3. What topic area should be probed next to get a complete picture?
4. What difficulty is appropriate given their trajectory?

Return a JSON object with:
  "reasoning"  (str)  — your chain-of-thought reasoning (2-3 sentences)
  "topic"      (str)  — specific topic to focus on (e.g. "Redis caching strategies", not "databases")
  "difficulty" (str)  — "easy" | "medium" | "hard"
  "category"   (str)  — "technical" | "behavioural" | "system_design"

Return only valid JSON.""",
            temperature=0.4,
        )

        difficulty = Difficulty(decision.get("difficulty", "medium"))
        category = Category(decision.get("category", "technical"))
        topic = decision.get("topic", memory.focus_areas[0] if memory.focus_areas else memory.inferred_role)
        reasoning = decision.get("reasoning", "")

        self.log(memory, f"Decided: {category.value}/{difficulty.value} on '{topic}' — {reasoning}")

        # ── ACT: generate the actual question ─────────────────────────────
        asked_texts = [o.question_text for o in memory.observations]
        avoid_block = ""
        if asked_texts:
            lines = "\n".join(f"- {q}" for q in asked_texts)
            avoid_block = f"\nDo NOT repeat these questions:\n{lines}"

        question_text = await self.reason(
            f"""You are interviewing for a {memory.inferred_role} role.
Generate a single {difficulty.value} {category.value} interview question about: {topic}

Rules:
- Ask ONE specific, focused question — no multi-part questions
- Keep it under 40 words
- technical: test a concrete concept, API, or language feature
- system_design: describe ONE real-world system to design or debug
- behavioural: use situation-based framing (STAR method)
- Return ONLY the question text. No numbering, no preamble.
{avoid_block}""",
            temperature=0.7,
        )

        question_text = question_text.strip().strip('"').strip("'")

        # ── OBSERVE: record decision in shared memory ─────────────────────
        memory.interviewer_decisions.append(InterviewerDecision(
            chosen_topic=topic,
            chosen_difficulty=difficulty.value,
            chosen_category=category.value,
            reasoning=reasoning,
        ))

        return QuestionOut(
            id=str(uuid.uuid4()),
            text=question_text,
            category=category,
            difficulty=difficulty,
        )


# Singleton instance
interviewer_agent = InterviewerAgent()
