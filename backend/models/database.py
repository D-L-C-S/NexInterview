"""SQLAlchemy ORM models and session factory for NexInterview.

Tables:
  candidate_profiles  — parsed resume data and inferred roles
  interview_sessions  — session state and question count
  questions           — questions generated and asked per session
  answers             — candidate answers with all evaluation scores
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime
from typing import Generator

from sqlalchemy import (
    Column, DateTime, Float, ForeignKey, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import Session, declarative_base, sessionmaker
from sqlalchemy.pool import StaticPool

from backend.config import settings

# StaticPool is required for SQLite under FastAPI's multi-threaded request handling
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yield a DB session, guaranteed to close after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Called once at application startup via the lifespan event."""
    Base.metadata.create_all(bind=engine)


# ── ORM Models ────────────────────────────────────────────────────────────────

class CandidateProfile(Base):
    """Stores parsed resume data and Groq-inferred role profile for a candidate."""

    __tablename__ = "candidate_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, default="")
    skills_json = Column(Text, default="[]")
    experience_years = Column(Integer, default=0)
    inferred_role = Column(String, default="")
    all_roles_json = Column(Text, default="[]")
    focus_areas_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    # JSON list accessors — SQLite has no native array type
    @property
    def skills(self) -> list[str]:
        """Return skills as a Python list."""
        return json.loads(self.skills_json or "[]")

    @skills.setter
    def skills(self, v: list[str]) -> None:
        self.skills_json = json.dumps(v)

    @property
    def all_roles(self) -> list[str]:
        """Return all inferred roles as a Python list."""
        return json.loads(self.all_roles_json or "[]")

    @all_roles.setter
    def all_roles(self, v: list[str]) -> None:
        self.all_roles_json = json.dumps(v)

    @property
    def focus_areas(self) -> list[str]:
        """Return interview focus areas as a Python list."""
        return json.loads(self.focus_areas_json or "[]")

    @focus_areas.setter
    def focus_areas(self, v: list[str]) -> None:
        self.focus_areas_json = json.dumps(v)


class InterviewSession(Base):
    """Tracks the lifecycle of a single interview session."""

    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(String, ForeignKey("candidate_profiles.id"), nullable=False)
    status = Column(String, default="active")          # "active" | "completed"
    questions_total = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class QuestionRecord(Base):
    """A question that was generated and asked within a session."""

    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String, default="technical")     # Category enum value
    difficulty = Column(String, default="medium")      # Difficulty enum value
    asked_at = Column(DateTime, default=datetime.utcnow)


class AnswerRecord(Base):
    """A candidate's answer to a question, with all LLM and A/V evaluation scores."""

    __tablename__ = "answers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, ForeignKey("interview_sessions.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    answer_text = Column(Text, default="")
    technical_score = Column(Float, default=0.0)   # LLM: factual correctness
    depth_score = Column(Float, default=0.0)        # LLM: depth of knowledge
    confidence_score = Column(Float, default=0.0)  # A/V: from Person 2's audio module
    engagement_score = Column(Float, default=0.0)  # A/V: from Person 2's video module
    feedback_snippet = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
