"""GET /jobs — return ranked job listings matched to a session's candidate profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.models.database import CandidateProfile, InterviewSession, get_db
from backend.models.schemas import JobMatchResponse
from backend.modules.job_recommender import search_jobs

router = APIRouter()


@router.get("", response_model=list[JobMatchResponse])
async def get_jobs(
    session_id: str = Query(..., description="UUID of an active or completed interview session"),
    db: Session = Depends(get_db),
) -> list[JobMatchResponse]:
    """Return the top 5 job listings matched to the candidate's inferred role.

    Looks up the session → candidate profile → inferred_role, then queries
    JSearch via RapidAPI. Results are post-dated to the last month.

    Args:
        session_id: UUID of the interview session (query param)
        db:         injected SQLAlchemy session

    Raises:
        404: session or profile not found
        502: JSearch / RapidAPI request failed
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id!r} not found")

    profile = (
        db.query(CandidateProfile).filter(CandidateProfile.id == session.profile_id).first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")

    try:
        jobs = await search_jobs(role=profile.inferred_role)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Job search failed: {exc}") from exc

    return [JobMatchResponse(**job) for job in jobs]
