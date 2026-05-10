"""Evaluator Agent — reasons about answer quality with chain-of-thought analysis.

Unlike a simple LLM scoring call, this agent:
  1. Reads the full session context (previous answers, trajectory)
  2. Reasons about the answer's quality relative to the candidate's level
  3. Identifies specific strengths and weaknesses in the answer
  4. Produces calibrated scores with justification
  5. Records observations in shared memory for other agents to use
"""
from __future__ import annotations

from backend.agents.base_agent import BaseAgent
from backend.agents.session_memory import AnswerObservation, SessionMemory
from backend.modules.technical_evaluator import EvalResult


class EvaluatorAgent(BaseAgent):
    """Agent that evaluates interview answers with reasoned analysis."""

    @property
    def agent_name(self) -> str:
        return "EvaluatorAgent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are an expert technical interview evaluator. You don't just score answers — "
            "you reason deeply about the candidate's understanding, identify specific strengths "
            "and gaps, and calibrate your scores based on the difficulty level and the candidate's "
            "experience level. You consider the full session context when evaluating."
        )

    async def evaluate(
        self,
        memory: SessionMemory,
        question_text: str,
        question_category: str,
        question_difficulty: str,
        answer_text: str,
        confidence_score: float = 0.0,
        engagement_score: float = 0.0,
    ) -> EvalResult:
        """Evaluate an answer with full chain-of-thought reasoning.

        Agent loop:
          1. THINK — reason about answer quality in context
          2. ACT   — produce calibrated scores
          3. OBSERVE — record observation in shared memory

        Returns an EvalResult with scores and feedback.
        """
        # ── THINK + ACT: reason and score ─────────────────────────────────
        result = await self.reason_json(
            f"""Evaluate this interview answer in the context of the full session.

Session context:
{memory.to_context_string()}

Current question [{question_category}/{question_difficulty}]:
{question_text}

Candidate's answer:
{answer_text or "(no answer provided)"}

Reason step by step:
1. What did the candidate get right?
2. What did they miss or get wrong?
3. How does this compare to their previous answers — are they improving?
4. Given the difficulty level and their experience ({memory.experience_years} yrs), how should scores be calibrated?

Return a JSON object with:
  "reasoning"        (str)   — your chain-of-thought analysis (2-3 sentences)
  "technical_score"  (float) — 0.0–1.0, factual correctness
  "depth_score"      (float) — 0.0–1.0, depth of knowledge and examples
  "strengths"        (list[str]) — 1-2 specific things done well
  "weaknesses"       (list[str]) — 1-2 specific gaps or errors
  "feedback_snippet" (str)   — one actionable coaching sentence

Scoring guide:
  1.0 — expert-level with edge cases and examples
  0.7 — solid and correct but lacks depth
  0.5 — partial, some gaps
  0.3 — mostly incorrect or surface-level
  0.0 — completely wrong or no answer

Return only valid JSON.""",
            temperature=0.2,
        )

        technical_score = float(max(0.0, min(1.0, result.get("technical_score", 0.5))))
        depth_score = float(max(0.0, min(1.0, result.get("depth_score", 0.5))))
        feedback_snippet = result.get("feedback_snippet", "Keep practising — review the fundamentals.")
        reasoning = result.get("reasoning", "")
        strengths = result.get("strengths", [])
        weaknesses = result.get("weaknesses", [])

        self.log(memory, f"Evaluated: tech={technical_score:.2f} depth={depth_score:.2f} — {reasoning}")

        # ── OBSERVE: record in shared memory ──────────────────────────────
        memory.observations.append(AnswerObservation(
            question_text=question_text,
            question_category=question_category,
            question_difficulty=question_difficulty,
            answer_text=answer_text or "",
            technical_score=technical_score,
            depth_score=depth_score,
            confidence_score=confidence_score,
            engagement_score=engagement_score,
            feedback_snippet=feedback_snippet,
            evaluator_reasoning=reasoning,
        ))

        # Update identified strengths/weaknesses in memory
        for s in strengths:
            if s not in memory.identified_strengths:
                memory.identified_strengths.append(s)
        for w in weaknesses:
            if w not in memory.identified_weaknesses:
                memory.identified_weaknesses.append(w)

        # Update trajectory
        if memory.questions_answered >= 2:
            recent_scores = [
                (o.technical_score + o.depth_score) / 2
                for o in memory.observations[-3:]
            ]
            if len(recent_scores) >= 2:
                if recent_scores[-1] > recent_scores[0] + 0.1:
                    memory.overall_trajectory = "improving"
                elif recent_scores[-1] < recent_scores[0] - 0.1:
                    memory.overall_trajectory = "declining"
                else:
                    memory.overall_trajectory = "neutral"

        return EvalResult(
            technical_score=technical_score,
            depth_score=depth_score,
            feedback_snippet=feedback_snippet,
        )


# Singleton instance
evaluator_agent = EvaluatorAgent()
