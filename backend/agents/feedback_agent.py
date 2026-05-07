"""Feedback Agent — generates structured post-interview coaching reports via Gemini."""
from __future__ import annotations

import json

from backend.config import llm_client as _client, LLM_MODEL
from sqlalchemy.orm import Session

from backend.models.database import AnswerRecord, CandidateProfile, InterviewSession, QuestionRecord
from backend.models.schemas import FeedbackReportResponse, MultimodalScores


_FEEDBACK_PROMPT = """\
You are an expert interview coach. Analyse this mock interview session and generate a structured
feedback report as a JSON object with these exact keys:
  technical_gaps       (list[str]) — 2–4 specific technical topics the candidate needs to study
  communication_tips   (list[str]) — 2–3 concrete tips to improve answer delivery and clarity
  behavioural_insights (list[str]) — 1–2 observations about confidence and communication style
  overall_summary      (str)       — 2–3 sentences summarising performance honestly but encouragingly
  next_steps           (list[str]) — 3–5 specific, actionable learning goals with resources if possible

Session data:
{context}

Return only valid JSON. No markdown, no preamble.\
"""


def _avg_score(records: list[AnswerRecord], field: str) -> float:
    """Compute the mean of a score field, ignoring zero values (unfilled A/V scores).

    Args:
        records: list of AnswerRecord ORM objects
        field:   attribute name on AnswerRecord (e.g. "technical_score")

    Returns the average as a float rounded to 3 decimal places, or 0.0 if no values.
    """
    vals = [getattr(r, field) for r in records if getattr(r, field, 0.0) > 0.0]
    return round(sum(vals) / len(vals), 3) if vals else 0.0


def _strip_fences(text: str) -> str:
    """Remove accidental markdown code fences from an LLM response."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


async def generate_feedback(session_id: str, db: Session) -> FeedbackReportResponse:
    """Generate a full coaching report for a completed interview session.

    Fetches all Q&A pairs and scores from the DB, builds a structured context object,
    then calls Gemini to produce technical gaps, communication tips, and next steps.

    Args:
        session_id: UUID of the interview session
        db:         SQLAlchemy session

    Returns a FeedbackReportResponse ready to send to the frontend.

    Raises:
        ValueError:   session not found
        RuntimeError: Gemini returned unparseable JSON
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id!r} not found")

    profile = (
        db.query(CandidateProfile)
        .filter(CandidateProfile.id == session.profile_id)
        .first()
    )
    questions = (
        db.query(QuestionRecord)
        .filter(QuestionRecord.session_id == session_id)
        .all()
    )
    answers = (
        db.query(AnswerRecord)
        .filter(AnswerRecord.session_id == session_id)
        .all()
    )

    # Build Q&A pairs for the prompt
    answer_map = {a.question_id: a for a in answers}
    qa_pairs = []
    for q in questions:
        a = answer_map.get(q.id)
        if a:
            qa_pairs.append({
                "question": q.text,
                "category": q.category,
                "difficulty": q.difficulty,
                "answer": a.answer_text,
                "technical_score": a.technical_score,
                "depth_score": a.depth_score,
                "feedback_snippet": a.feedback_snippet,
            })

    avg_scores = MultimodalScores(
        technical_score=_avg_score(answers, "technical_score"),
        depth_score=_avg_score(answers, "depth_score"),
        confidence_score=_avg_score(answers, "confidence_score"),
        engagement_score=_avg_score(answers, "engagement_score"),
    )

    context = json.dumps({
        "role": profile.inferred_role if profile else "Software Engineer",
        "avg_technical_score": avg_scores.technical_score,
        "avg_depth_score": avg_scores.depth_score,
        "qa_pairs": qa_pairs,
    })

    response = await _client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": _FEEDBACK_PROMPT.format(context=context)}],
        temperature=0.3,
    )
    text = _strip_fences(response.choices[0].message.content)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"Gemini returned invalid JSON: {exc}\nRaw response (first 300 chars): {text[:300]}"
        ) from exc

    return FeedbackReportResponse(
        session_id=session_id,
        avg_scores=avg_scores,
        technical_gaps=data.get("technical_gaps", []),
        communication_tips=data.get("communication_tips", []),
        behavioural_insights=data.get("behavioural_insights", []),
        overall_summary=data.get("overall_summary", ""),
        next_steps=data.get("next_steps", []),
    )
