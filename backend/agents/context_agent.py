"""Context Agent — orchestrates the full resume-to-profile pipeline and persists to the DB."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from backend.models.database import CandidateProfile
from backend.models.schemas import CandidateProfileResponse
from backend.modules import resume_parser, role_inferencer


async def build_candidate_profile(
    file_path: str,
    db: Session,
) -> CandidateProfileResponse:
    """Run the full resume-to-profile pipeline and persist the result.

    Pipeline steps:
        1. Extract text from the uploaded PDF or .txt file
        2. Gemini: parse structured resume fields (skills, experience, education, etc.)
        3. Gemini: refine role inference and generate 5 interview focus areas
        4. Persist the profile to the database
        5. Return a CandidateProfileResponse containing the profile_id

    Args:
        file_path: absolute path to the uploaded resume file (.pdf or .txt)
        db:        SQLAlchemy session injected by FastAPI's Depends(get_db)

    Returns a CandidateProfileResponse. The profile_id is the entry point for
    POST /interview/start.

    Raises:
        ValueError:   unsupported file type or empty file
        RuntimeError: Gemini returned unparseable JSON at either pipeline step
    """
    # Step 1 + 2: extract text and parse with Gemini
    parsed = await resume_parser.parse_resume(file_path)

    # Step 3: deep role inference and focus area generation
    role_data = await role_inferencer.infer_roles(parsed)

    # Step 4: persist to DB
    profile = CandidateProfile()
    profile.id = str(uuid.uuid4())
    profile.name = parsed.get("name") or "Unknown"
    profile.email = parsed.get("email") or ""
    profile.skills = [s.lower().strip() for s in parsed.get("skills", []) if s]
    profile.experience_years = int(
        role_data.get("experience_years") or parsed.get("experience_years") or 0
    )
    profile.inferred_role = role_data.get("inferred_role") or ""
    profile.all_roles = role_data.get("all_roles") or []
    profile.focus_areas = role_data.get("focus_areas") or []

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return CandidateProfileResponse(
        profile_id=profile.id,
        name=profile.name,
        skills=profile.skills,
        experience_years=profile.experience_years,
        inferred_role=profile.inferred_role,
        all_roles=profile.all_roles,
        focus_areas=profile.focus_areas,
    )
