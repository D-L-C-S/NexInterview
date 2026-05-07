"""GET /feedback/{session_id} — generate and return a coaching report."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.feedback_agent import generate_feedback
from backend.models.database import get_db
from backend.models.schemas import FeedbackReportResponse

router = APIRouter()


@router.get("/{session_id}", response_model=FeedbackReportResponse)
async def get_feedback(
    session_id: str,
    db: Session = Depends(get_db),
) -> FeedbackReportResponse:
    """Generate a structured coaching report for a completed interview session.

    Calls Gemini to analyse all Q&A pairs and produce technical gaps,
    communication tips, behavioural insights, and actionable next steps.

    Can be called on active sessions too (partial feedback based on answers so far).

    Args:
        session_id: UUID of the interview session
        db:         injected SQLAlchemy session

    Raises:
        404: session not found
        500: Gemini error or unexpected failure
    """
    try:
        return await generate_feedback(session_id=session_id, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc
