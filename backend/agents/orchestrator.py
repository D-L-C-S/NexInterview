"""Orchestrator Agent — coordinates the multi-agent interview system.

This is the central coordinator that:
  1. Manages the interview lifecycle (start → Q&A loop → complete)
  2. Delegates to specialised agents (InterviewerAgent, EvaluatorAgent)
  3. Maintains shared SessionMemory across all agents
  4. Makes meta-decisions about session flow based on agent outputs

Agent interaction flow:
  ┌──────────────┐     ┌───────────────────┐     ┌────────────────┐
  │ Orchestrator │────▶│ InterviewerAgent  │────▶│ EvaluatorAgent │
  │  (coordinator)│     │ (question design) │     │ (answer eval)  │
  └──────┬───────┘     └───────────────────┘     └────────────────┘
         │                       ▲                        ▲
         │              ┌────────┴────────────────────────┘
         ▼              │
  ┌──────────────┐      │
  │SessionMemory │◀─────┘  (all agents read/write)
  └──────────────┘
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from backend.agents.evaluator_agent import evaluator_agent
from backend.agents.interviewer_agent import interviewer_agent
from backend.agents.session_memory import get_memory
from backend.models.database import (
    AnswerRecord, CandidateProfile, InterviewSession, QuestionRecord,
)
from backend.models.schemas import (
    CandidateSummary, Difficulty, InterviewSessionResponse, MultimodalScores,
    QuestionOut, QuestionResult, SessionStatus, StartInterviewResponse,
    SubmitAnswerResponse,
)

QUESTIONS_PER_SESSION = 5


async def start_session(profile_id: str, db: Session) -> StartInterviewResponse:
    """Create a new interview session, initialise shared memory, and generate the first question.

    The orchestrator:
      1. Loads the candidate profile from DB
      2. Initialises shared SessionMemory with candidate context
      3. Delegates to InterviewerAgent to generate the first question
      4. Persists the session and question to DB

    Args:
        profile_id: UUID returned by POST /resume/upload
        db:         SQLAlchemy session

    Returns a StartInterviewResponse with session_id and the first QuestionOut.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise ValueError(f"Profile {profile_id!r} not found")

    # Create DB session
    session = InterviewSession(
        profile_id=profile_id,
        status="active",
        questions_total=QUESTIONS_PER_SESSION,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # ── Initialise shared memory for all agents ───────────────────────────
    memory = get_memory(session.id)
    memory.profile_id = profile_id
    memory.candidate_name = profile.name
    memory.inferred_role = profile.inferred_role
    memory.skills = profile.skills
    memory.focus_areas = profile.focus_areas
    memory.experience_years = profile.experience_years
    memory.orchestrator_notes.append(
        f"[Orchestrator] Session started for {profile.name} → {profile.inferred_role}"
    )

    # ── Delegate to InterviewerAgent for first question ───────────────────
    first_q = await interviewer_agent.decide_next_question(
        memory=memory,
        question_index=0,
    )

    # Persist question
    db.add(QuestionRecord(
        id=first_q.id,
        session_id=session.id,
        text=first_q.text,
        category=first_q.category.value,
        difficulty=first_q.difficulty.value,
    ))
    db.commit()

    return StartInterviewResponse(session_id=session.id, question=first_q)


async def process_answer(
    session_id: str,
    question_id: str,
    answer_text: str,
    db: Session,
    confidence_score: float | None = None,
    engagement_score: float | None = None,
) -> SubmitAnswerResponse:
    """Process a candidate's answer through the multi-agent pipeline.

    Orchestration flow:
      1. Load session context
      2. Delegate to EvaluatorAgent → evaluate answer with chain-of-thought reasoning
      3. EvaluatorAgent writes observations to SessionMemory
      4. Orchestrator updates session patterns (trajectory, difficulty trend)
      5. If more questions remain: delegate to InterviewerAgent for next question
         (InterviewerAgent reads SessionMemory to make context-aware decisions)
      6. Persist all results to DB

    Args:
        session_id:       UUID of the active session
        question_id:      UUID of the question being answered
        answer_text:      candidate's verbatim answer
        db:               SQLAlchemy session
        confidence_score: optional 0–1 from browser speech analysis
        engagement_score: optional 0–1 from browser face mesh analysis
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id!r} not found")
    if session.status == "completed":
        raise ValueError(f"Session {session_id!r} is already completed")

    question = db.query(QuestionRecord).filter(QuestionRecord.id == question_id).first()
    if not question:
        raise ValueError(f"Question {question_id!r} not found")

    # Get shared memory
    memory = get_memory(session_id)

    # ── Agent 1: EvaluatorAgent — evaluate the answer ─────────────────────
    eval_result = await evaluator_agent.evaluate(
        memory=memory,
        question_text=question.text,
        question_category=question.category,
        question_difficulty=question.difficulty,
        answer_text=answer_text,
        confidence_score=confidence_score or 0.0,
        engagement_score=engagement_score or 0.0,
    )

    # Persist answer + scores
    db.add(AnswerRecord(
        session_id=session_id,
        question_id=question_id,
        answer_text=answer_text,
        technical_score=eval_result.technical_score,
        depth_score=eval_result.depth_score,
        confidence_score=confidence_score or 0.0,
        engagement_score=engagement_score or 0.0,
        feedback_snippet=eval_result.feedback_snippet,
    ))
    db.commit()

    scores = MultimodalScores(
        technical_score=eval_result.technical_score,
        depth_score=eval_result.depth_score,
        confidence_score=confidence_score or 0.0,
        engagement_score=engagement_score or 0.0,
    )

    answered_count = (
        db.query(AnswerRecord).filter(AnswerRecord.session_id == session_id).count()
    )

    # ── Orchestrator: check if session is complete ────────────────────────
    if answered_count >= session.questions_total:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()

        memory.orchestrator_notes.append(
            f"[Orchestrator] Session completed. {answered_count} questions answered. "
            f"Final trajectory: {memory.overall_trajectory}. "
            f"Avg technical: {memory.avg_technical_score:.2f}"
        )

        return SubmitAnswerResponse(
            scores=scores,
            feedback_snippet=eval_result.feedback_snippet,
            next_question=None,
            session_complete=True,
        )

    # ── Orchestrator: update difficulty trend for InterviewerAgent ─────────
    if memory.questions_answered >= 2:
        recent = memory.observations[-2:]
        avg_recent = sum((o.technical_score + o.depth_score) / 2 for o in recent) / len(recent)
        if avg_recent > 0.7:
            memory.difficulty_trend = "ramping_up"
        elif avg_recent < 0.4:
            memory.difficulty_trend = "easing_down"
        else:
            memory.difficulty_trend = "stable"

    memory.orchestrator_notes.append(
        f"[Orchestrator] After Q{answered_count}: trajectory={memory.overall_trajectory}, "
        f"difficulty_trend={memory.difficulty_trend}"
    )

    # ── Agent 2: InterviewerAgent — generate next question ────────────────
    # The InterviewerAgent reads the full SessionMemory (including EvaluatorAgent's
    # observations) to make a context-aware decision about what to ask next.
    next_q = await interviewer_agent.decide_next_question(
        memory=memory,
        question_index=answered_count,
    )

    # Persist question
    db.add(QuestionRecord(
        id=next_q.id,
        session_id=session_id,
        text=next_q.text,
        category=next_q.category.value,
        difficulty=next_q.difficulty.value,
    ))
    db.commit()

    return SubmitAnswerResponse(
        scores=scores,
        feedback_snippet=eval_result.feedback_snippet,
        next_question=next_q,
        session_complete=False,
    )


def get_session(session_id: str, db: Session) -> InterviewSessionResponse:
    """Fetch full session state including all answered Q&A results.

    Args:
        session_id: UUID of the session to retrieve
        db:         SQLAlchemy session

    Returns an InterviewSessionResponse with candidate summary and all scored results.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id!r} not found")

    profile = db.query(CandidateProfile).filter(CandidateProfile.id == session.profile_id).first()
    questions = db.query(QuestionRecord).filter(QuestionRecord.session_id == session_id).all()
    answers = db.query(AnswerRecord).filter(AnswerRecord.session_id == session_id).all()

    answer_map = {a.question_id: a for a in answers}
    results: list[QuestionResult] = []
    for q in questions:
        a = answer_map.get(q.id)
        if a:
            results.append(QuestionResult(
                question=QuestionOut(
                    id=q.id, text=q.text,
                    category=q.category, difficulty=q.difficulty,
                ),
                answer_text=a.answer_text,
                scores=MultimodalScores(
                    technical_score=a.technical_score,
                    depth_score=a.depth_score,
                    confidence_score=a.confidence_score,
                    engagement_score=a.engagement_score,
                ),
            ))

    return InterviewSessionResponse(
        session_id=session_id,
        status=SessionStatus(session.status),
        candidate=CandidateSummary(
            inferred_role=profile.inferred_role if profile else "",
            skills=profile.skills if profile else [],
            focus_areas=profile.focus_areas if profile else [],
        ),
        results=results,
        questions_asked=len(answers),
        questions_total=session.questions_total,
    )
