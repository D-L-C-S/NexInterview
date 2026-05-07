"""Interview Orchestrator — drives the question loop, adapts difficulty, finalises sessions."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from backend.models.database import (
    AnswerRecord, CandidateProfile, InterviewSession, QuestionRecord,
)
from backend.models.schemas import (
    CandidateSummary, Difficulty, InterviewSessionResponse, MultimodalScores,
    QuestionOut, QuestionResult, SessionStatus, StartInterviewResponse,
    SubmitAnswerResponse,
)
from backend.modules import question_generator, technical_evaluator

QUESTIONS_PER_SESSION = 5


async def start_session(profile_id: str, db: Session) -> StartInterviewResponse:
    """Create a new interview session and return the first question.

    Generates the opening question at medium difficulty targeting the candidate's
    inferred role and focus areas.

    Args:
        profile_id: UUID returned by POST /resume/upload
        db:         SQLAlchemy session

    Returns a StartInterviewResponse with session_id and the first QuestionOut.

    Raises:
        ValueError: profile not found in the database
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
    if not profile:
        raise ValueError(f"Profile {profile_id!r} not found")

    session = InterviewSession(
        profile_id=profile_id,
        status="active",
        questions_total=QUESTIONS_PER_SESSION,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    first_q = await question_generator.generate_question(
        role=profile.inferred_role,
        focus_areas=profile.focus_areas,
        difficulty=Difficulty.medium,
        asked_questions=[],
        question_index=0,
    )

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
    """Evaluate an answer, persist scores, then generate and return the next question.

    If this was the last question, marks the session as completed and returns
    session_complete=True with next_question=None.

    Difficulty adapts for the next question based on the technical score just received:
        > 0.75 → bump up  |  < 0.40 → drop down  |  otherwise → keep

    Args:
        session_id:       UUID of the active session
        question_id:      UUID of the question being answered
        answer_text:      candidate's verbatim answer text
        db:               SQLAlchemy session
        confidence_score: optional 0–1 float from Person 2's audio module
        engagement_score: optional 0–1 float from Person 2's video module

    Raises:
        ValueError: session or question not found, or session already completed
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise ValueError(f"Session {session_id!r} not found")
    if session.status == "completed":
        raise ValueError(f"Session {session_id!r} is already completed")

    question = db.query(QuestionRecord).filter(QuestionRecord.id == question_id).first()
    if not question:
        raise ValueError(f"Question {question_id!r} not found")

    profile = db.query(CandidateProfile).filter(CandidateProfile.id == session.profile_id).first()
    role = profile.inferred_role if profile else "Software Engineer"

    # Evaluate the answer
    eval_result = await technical_evaluator.evaluate_answer(
        question=question.text,
        answer_text=answer_text,
        role=role,
        difficulty=question.difficulty,
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

    # Session complete?
    if answered_count >= session.questions_total:
        session.status = "completed"
        session.completed_at = datetime.utcnow()
        db.commit()
        return SubmitAnswerResponse(
            scores=scores,
            feedback_snippet=eval_result.feedback_snippet,
            next_question=None,
            session_complete=True,
        )

    # Adapt difficulty and generate next question
    next_difficulty = question_generator.adapt_difficulty(
        current=Difficulty(question.difficulty),
        last_technical_score=eval_result.technical_score,
    )
    asked_texts = [
        q.text
        for q in db.query(QuestionRecord).filter(QuestionRecord.session_id == session_id).all()
    ]

    next_q = await question_generator.generate_question(
        role=role,
        focus_areas=profile.focus_areas if profile else [],
        difficulty=next_difficulty,
        asked_questions=asked_texts,
        question_index=answered_count,
    )

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

    Raises:
        ValueError: session not found
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
