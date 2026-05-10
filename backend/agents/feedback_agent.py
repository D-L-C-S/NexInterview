"""Coach Agent (Feedback) — generates post-interview coaching using full session memory.

This agent:
  1. Reads the complete SessionMemory (all agent observations, reasoning, patterns)
  2. Synthesises a holistic coaching report using the accumulated context
  3. Produces actionable feedback that references specific Q&A moments
  4. Uses the identified strengths/weaknesses from EvaluatorAgent observations
"""
from __future__ import annotations

import json

from backend.agents.base_agent import BaseAgent
from backend.agents.session_memory import get_memory
from backend.config import llm_client as _client, LLM_MODEL
from sqlalchemy.orm import Session

from backend.models.database import AnswerRecord, CandidateProfile, InterviewSession, QuestionRecord
from backend.models.schemas import FeedbackReportResponse, MultimodalScores


class CoachAgent(BaseAgent):
    """Agent that generates comprehensive coaching reports from session memory."""

    @property
    def agent_name(self) -> str:
        return "CoachAgent"

    @property
    def system_prompt(self) -> str:
        return (
            "You are an expert interview coach. You don't just analyse scores — "
            "you synthesise the full session context including evaluator observations, "
            "interviewer reasoning, and candidate trajectory to produce deeply personalised, "
            "actionable coaching. You reference specific answers and moments from the interview."
        )


def _avg_score(records: list[AnswerRecord], field: str) -> float:
    """Compute the mean of a score field, ignoring zero values (unfilled A/V scores).

    Args:
        records: list of AnswerRecord ORM objects
        field:   attribute name on AnswerRecord (e.g. "technical_score")

    Returns the average as a float rounded to 3 decimal places, or 0.0 if no values.
    """
    vals = [getattr(r, field) for r in records if getattr(r, field, 0.0) > 0.0]
    return round(sum(vals) / len(vals), 3) if vals else 0.0


_coach = CoachAgent()


async def generate_feedback(session_id: str, db: Session) -> FeedbackReportResponse:
    """Generate a coaching report using the CoachAgent and full session memory.

    Agent loop:
      1. Load session memory (accumulated by all agents during the interview)
      2. THINK — CoachAgent reasons about the full session holistically
      3. ACT — generate structured coaching output
      4. OBSERVE — return the report

    Args:
        session_id: UUID of the interview session
        db:         SQLAlchemy session

    Returns a FeedbackReportResponse ready to send to the frontend.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id!r} not found")

    profile = (
        db.query(CandidateProfile)
        .filter(CandidateProfile.id == session.profile_id)
        .first()
    )
    answers = (
        db.query(AnswerRecord)
        .filter(AnswerRecord.session_id == session_id)
        .all()
    )

    avg_scores = MultimodalScores(
        technical_score=_avg_score(answers, "technical_score"),
        depth_score=_avg_score(answers, "depth_score"),
        confidence_score=_avg_score(answers, "confidence_score"),
        engagement_score=_avg_score(answers, "engagement_score"),
    )

    # ── Build rich context from shared memory ─────────────────────────────
    memory = get_memory(session_id)
    memory_context = memory.to_context_string()

    # Include agent reasoning traces
    agent_notes = "\n".join(memory.orchestrator_notes) if memory.orchestrator_notes else "(no agent notes)"

    # ── CoachAgent THINK + ACT ────────────────────────────────────────────
    coaching_data = await _coach.reason_json(
        f"""Generate a comprehensive coaching report for this completed interview.

Full session memory (includes all agent observations and reasoning):
{memory_context}

Agent coordination notes:
{agent_notes}

Identified strengths: {', '.join(memory.identified_strengths) or 'none yet'}
Identified weaknesses: {', '.join(memory.identified_weaknesses) or 'none yet'}
Performance trajectory: {memory.overall_trajectory}

Average scores:
  Technical: {avg_scores.technical_score:.2f}
  Depth: {avg_scores.depth_score:.2f}
  Confidence: {avg_scores.confidence_score:.2f}
  Engagement: {avg_scores.engagement_score:.2f}

Generate a JSON object with these exact keys:
  technical_gaps       (list[str]) — 2–4 specific technical topics to study, referencing the actual questions where gaps appeared
  communication_tips   (list[str]) — 2–3 concrete tips to improve answer delivery
  behavioural_insights (list[str]) — 1–2 observations about confidence and style
  overall_summary      (str)       — 2–3 sentences summarising performance, referencing specific strengths and the trajectory
  next_steps           (list[str]) — 3–5 specific, actionable learning goals with resources

Return only valid JSON. No markdown, no preamble.""",
        temperature=0.3,
    )

    _coach.log(memory, f"Generated coaching report. Trajectory: {memory.overall_trajectory}")

    return FeedbackReportResponse(
        session_id=session_id,
        avg_scores=avg_scores,
        technical_gaps=coaching_data.get("technical_gaps", []),
        communication_tips=coaching_data.get("communication_tips", []),
        behavioural_insights=coaching_data.get("behavioural_insights", []),
        overall_summary=coaching_data.get("overall_summary", ""),
        next_steps=coaching_data.get("next_steps", []),
    )
