"""POST /resume/upload — parse a resume and return a CandidateProfile."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.agents.context_agent import build_candidate_profile
from backend.models.database import get_db
from backend.models.schemas import CandidateProfileResponse

router = APIRouter()


@router.post("/upload", response_model=CandidateProfileResponse, status_code=201)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CandidateProfileResponse:
    """Accept a PDF or .txt resume, parse it with Gemini, and return a CandidateProfile.

    The profile_id in the response is the entry point for POST /interview/start.

    Args:
        file: multipart upload — must be .pdf or .txt
        db:   injected SQLAlchemy session

    Returns a CandidateProfileResponse with profile_id, skills, inferred roles, and focus areas.

    Raises:
        400: unsupported file type
        422: parsing or LLM error
    """
    suffix = Path(file.filename or "resume.pdf").suffix.lower()
    if suffix not in (".pdf", ".txt", ".text"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {suffix!r}. Upload a .pdf or .txt file.",
        )

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        profile = await build_candidate_profile(tmp_path, db)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {exc}") from exc
    finally:
        os.unlink(tmp_path)

    return profile
