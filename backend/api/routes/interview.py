"""Interview routes — start a session, submit answers, fetch session state."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.orchestrator import get_session, process_answer, start_session
from backend.models.database import get_db
from backend.models.schemas import (
    InterviewSessionResponse,
    StartInterviewRequest,
    StartInterviewResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)

router = APIRouter()


@router.post("/start", response_model=StartInterviewResponse, status_code=201)
async def start_interview(
    body: StartInterviewRequest,
    db: Session = Depends(get_db),
) -> StartInterviewResponse:
    """Open a new 5-question interview session and return the first question.

    Args:
        body: { profile_id } — UUID from POST /resume/upload
        db:   injected SQLAlchemy session

    Returns session_id and the first QuestionOut at medium difficulty.

    Raises:
        404: profile_id not found
        500: unexpected error
    """
    try:
        return await start_session(profile_id=body.profile_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc


@router.post("/answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    body: SubmitAnswerRequest,
    db: Session = Depends(get_db),
) -> SubmitAnswerResponse:
    """Submit an answer, receive evaluation scores, and get the next question.

    When session_complete is True, next_question will be null — the frontend
    should redirect to GET /feedback/{session_id}.

    Args:
        body: session_id, question_id, answer_text, and optional A/V scores
        db:   injected SQLAlchemy session

    Raises:
        404: session or question not found
        400: session already completed
        500: unexpected error
    """
    try:
        return await process_answer(
            session_id=body.session_id,
            question_id=body.question_id,
            answer_text=body.answer_text,
            db=db,
            confidence_score=body.confidence_score,
            engagement_score=body.engagement_score,
        )
    except ValueError as exc:
        status = 400 if "already completed" in str(exc) else 404
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc


@router.get("/{session_id}", response_model=InterviewSessionResponse)
async def get_interview(
    session_id: str,
    db: Session = Depends(get_db),
) -> InterviewSessionResponse:
    """Return full session state: candidate summary, all Q&A results, and scores so far.

    Args:
        session_id: UUID of the session to retrieve
        db:         injected SQLAlchemy session

    Raises:
        404: session not found
    """
    try:
        return get_session(session_id=session_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
