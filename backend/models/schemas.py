"""Pydantic schemas — shared request/response models for all API endpoints."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Category(str, Enum):
    technical = "technical"
    behavioural = "behavioural"
    system_design = "system_design"


class SessionStatus(str, Enum):
    active = "active"
    completed = "completed"


# ── Resume ────────────────────────────────────────────────────────────────────

class CandidateProfileResponse(BaseModel):
    """Returned after a successful resume upload and parse."""

    profile_id: str
    name: str
    skills: list[str]
    experience_years: int
    inferred_role: str
    all_roles: list[str]
    focus_areas: list[str]


# ── Interview ─────────────────────────────────────────────────────────────────

class QuestionOut(BaseModel):
    """A single interview question as returned by the API."""

    id: str
    text: str
    category: Category
    difficulty: Difficulty


class StartInterviewRequest(BaseModel):
    """Request body for POST /interview/start."""

    profile_id: str


class StartInterviewResponse(BaseModel):
    """Response for POST /interview/start — opens a session and sends the first question."""

    session_id: str
    question: QuestionOut


class SubmitAnswerRequest(BaseModel):
    """Request body for POST /interview/answer.

    confidence_score and engagement_score are injected by Person 2's A/V modules.
    Pass null if not available — they will be excluded from score averages.
    """

    session_id: str
    question_id: str
    answer_text: str
    confidence_score: Optional[float] = Field(default=None, ge=0, le=1)
    engagement_score: Optional[float] = Field(default=None, ge=0, le=1)


class MultimodalScores(BaseModel):
    """Composite scores across all evaluation dimensions (all values 0–1)."""

    technical_score: float = Field(ge=0, le=1)
    depth_score: float = Field(ge=0, le=1)
    confidence_score: float = Field(ge=0, le=1)
    engagement_score: float = Field(ge=0, le=1)


class SubmitAnswerResponse(BaseModel):
    """Response for POST /interview/answer."""

    scores: MultimodalScores
    feedback_snippet: str
    next_question: Optional[QuestionOut] = None
    session_complete: bool


class QuestionResult(BaseModel):
    """A question + the candidate's answer and scores, used in session history."""

    question: QuestionOut
    answer_text: str
    scores: MultimodalScores


class CandidateSummary(BaseModel):
    """Slim candidate view embedded in session and feedback responses."""

    inferred_role: str
    skills: list[str]
    focus_areas: list[str]


class InterviewSessionResponse(BaseModel):
    """Full session state returned by GET /interview/{session_id}."""

    session_id: str
    status: SessionStatus
    candidate: CandidateSummary
    results: list[QuestionResult]
    questions_asked: int
    questions_total: int


# ── Feedback ──────────────────────────────────────────────────────────────────

class FeedbackReportResponse(BaseModel):
    """Structured post-interview coaching report."""

    session_id: str
    avg_scores: MultimodalScores
    technical_gaps: list[str]
    communication_tips: list[str]
    behavioural_insights: list[str]
    overall_summary: str
    next_steps: list[str]


# ── Jobs ──────────────────────────────────────────────────────────────────────

class JobMatchResponse(BaseModel):
    """A single job listing from JSearch, enriched with a match reason."""

    title: str
    company: str
    location: str = ""
    url: str
    match_reason: str
