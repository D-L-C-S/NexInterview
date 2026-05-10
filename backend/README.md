# NexInterview — Backend

FastAPI backend powering the NexInterview platform. Handles resume parsing, agentic interview
orchestration, multimodal scoring (text + optional audio/video), and job recommendations.

## Stack

| Layer | Technology |
|-------|-----------|
| Web framework | FastAPI + Uvicorn |
| Package manager | [uv](https://docs.astral.sh/uv/) |
| LLM | Groq API (Llama 3.3 70B Versatile) |
| Resume parsing | pdfplumber |
| Database | SQLAlchemy + SQLite (swap `DATABASE_URL` for Postgres) |
| Job search | JSearch via RapidAPI |
| Real-time | WebSockets (stub) |

## Setup

```bash
# From the repo root
cp .env.example .env          # fill in GROQ_API_KEY and RAPIDAPI_KEY
uv sync                       # installs all deps into .venv
uv run uvicorn backend.main:app --reload
```

API available at <http://localhost:8000>
Interactive docs at <http://localhost:8000/docs>

## Project Layout

```text
backend/
├── main.py               # FastAPI app entry point, router registration
├── config.py             # Settings loaded from .env via pydantic-settings
├── pyproject.toml        # uv-managed dependencies
├── agents/
│   ├── orchestrator.py   # Central decision-maker: question flow + difficulty adaptation
│   ├── context_agent.py  # Resume → CandidateProfile (roles, skills, focus areas)
│   └── feedback_agent.py # Post-session coaching report via Groq LLM
├── modules/
│   ├── resume_parser.py        # PDF/text extraction + Groq structured parsing
│   ├── role_inferencer.py      # Infers target job roles from resume signals
│   ├── question_generator.py   # Dynamic question generation (Groq LLM)
│   ├── audio_analyzer.py       # (stub) Whisper STT + librosa tone analysis
│   ├── video_analyzer.py       # (stub) MediaPipe + DeepFace scoring
│   ├── technical_evaluator.py  # Semantic scoring + depth analysis
│   └── job_recommender.py      # Searches JSearch API, ranks by role match
├── api/
│   ├── routes/
│   │   ├── resume.py     # POST /resume/upload
│   │   ├── interview.py  # POST /interview/start, POST /interview/answer
│   │   ├── feedback.py   # GET  /feedback/{session_id}
│   │   └── jobs.py       # GET  /jobs
│   └── websocket.py      # ws://.../ws/{session_id} — real-time (stub)
└── models/
    ├── schemas.py         # Pydantic request/response models
    └── database.py        # SQLAlchemy table definitions
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `POST` | `/resume/upload` | Upload PDF/text resume, returns `CandidateProfileResponse` |
| `POST` | `/interview/start` | Begin session for a candidate profile |
| `POST` | `/interview/answer` | Submit answer, get next question + live scores |
| `GET` | `/interview/{id}` | Fetch current session state |
| `GET` | `/feedback/{session_id}` | Retrieve `FeedbackReportResponse` |
| `GET` | `/jobs?session_id=` | Ranked job recommendations for a session |
| `WS` | `/ws/{session_id}` | Stream audio/video frames (stub) |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `RAPIDAPI_KEY` | Yes | — | RapidAPI key for JSearch |
| `GEMINI_API_KEY` | No | — | Google Gemini key (reserved) |
| `DATABASE_URL` | No | `sqlite:///./nexinterview.db` | SQLAlchemy DB URL |
| `WHISPER_MODEL` | No | `base` | Whisper model size |

## Running Tests

```bash
uv run pytest
```
