"""Session Memory — shared context store that all agents read and write to.

Each interview session has its own SessionMemory instance. Agents record
observations, reasoning traces, and decisions here so that downstream agents
can make informed, context-aware choices.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class AnswerObservation:
    """An evaluator agent's observation about a single answer."""

    question_text: str
    question_category: str
    question_difficulty: str
    answer_text: str
    technical_score: float
    depth_score: float
    confidence_score: float
    engagement_score: float
    feedback_snippet: str
    evaluator_reasoning: str  # chain-of-thought from the evaluator agent
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class InterviewerDecision:
    """An interviewer agent's reasoning for choosing a question."""

    chosen_topic: str
    chosen_difficulty: str
    chosen_category: str
    reasoning: str  # why this topic/difficulty was selected
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class SessionMemory:
    """Shared context memory for a single interview session.

    All agents read from and write to this memory, enabling inter-agent
    communication and context-aware decision making.
    """

    # ── Candidate context (set once at session start) ─────────────────────
    profile_id: str = ""
    candidate_name: str = ""
    inferred_role: str = ""
    skills: list[str] = field(default_factory=list)
    focus_areas: list[str] = field(default_factory=list)
    experience_years: int = 0

    # ── Running session state (updated after each Q&A) ────────────────────
    observations: list[AnswerObservation] = field(default_factory=list)
    interviewer_decisions: list[InterviewerDecision] = field(default_factory=list)
    orchestrator_notes: list[str] = field(default_factory=list)

    # ── Derived patterns (updated by orchestrator after each round) ───────
    identified_strengths: list[str] = field(default_factory=list)
    identified_weaknesses: list[str] = field(default_factory=list)
    difficulty_trend: str = "stable"  # "ramping_up" | "stable" | "easing_down"
    overall_trajectory: str = "neutral"  # "improving" | "neutral" | "declining"

    @property
    def questions_answered(self) -> int:
        return len(self.observations)

    @property
    def avg_technical_score(self) -> float:
        if not self.observations:
            return 0.0
        return sum(o.technical_score for o in self.observations) / len(self.observations)

    @property
    def avg_depth_score(self) -> float:
        if not self.observations:
            return 0.0
        return sum(o.depth_score for o in self.observations) / len(self.observations)

    @property
    def last_score(self) -> float:
        if not self.observations:
            return 0.5
        o = self.observations[-1]
        return (o.technical_score + o.depth_score) / 2

    def to_context_string(self) -> str:
        """Serialize the full session memory into a text block for LLM prompts."""
        lines = [
            f"Candidate: {self.candidate_name} | Role: {self.inferred_role}",
            f"Skills: {', '.join(self.skills[:10])}",
            f"Experience: {self.experience_years} years",
            f"Focus areas: {', '.join(self.focus_areas)}",
            f"Questions answered: {self.questions_answered}",
            f"Avg technical: {self.avg_technical_score:.2f} | Avg depth: {self.avg_depth_score:.2f}",
            f"Trajectory: {self.overall_trajectory} | Difficulty trend: {self.difficulty_trend}",
        ]

        if self.identified_strengths:
            lines.append(f"Strengths identified: {', '.join(self.identified_strengths)}")
        if self.identified_weaknesses:
            lines.append(f"Weaknesses identified: {', '.join(self.identified_weaknesses)}")

        if self.observations:
            lines.append("\n--- Q&A History ---")
            for i, obs in enumerate(self.observations, 1):
                lines.append(
                    f"Q{i} [{obs.question_category}/{obs.question_difficulty}]: {obs.question_text}\n"
                    f"   Answer: {obs.answer_text[:150]}...\n"
                    f"   Scores: tech={obs.technical_score:.2f} depth={obs.depth_score:.2f}\n"
                    f"   Evaluator: {obs.evaluator_reasoning}"
                )

        return "\n".join(lines)


# ── In-memory session store ───────────────────────────────────────────────
_sessions: dict[str, SessionMemory] = {}


def get_memory(session_id: str) -> SessionMemory:
    """Get or create a SessionMemory for the given session ID."""
    if session_id not in _sessions:
        _sessions[session_id] = SessionMemory()
    return _sessions[session_id]


def clear_memory(session_id: str) -> None:
    """Remove a session's memory (e.g. after feedback is generated)."""
    _sessions.pop(session_id, None)
