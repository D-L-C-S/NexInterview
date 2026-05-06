# NexInterview — Backend

FastAPI backend powering the NexInterview platform. Handles resume parsing, agentic interview
orchestration, multimodal scoring (audio + video + text), and job recommendations.

## Stack

| Layer | Technology |
|-------|-----------|
| Web framework | FastAPI + Uvicorn |
| Package manager | [uv](https://docs.astral.sh/uv/) |
| LLM | Claude API (Anthropic SDK) |
| Speech-to-text | OpenAI Whisper |
| Audio analysis | librosa |
| Video / CV | MediaPipe + DeepFace |
| Resume parsing | pdfplumber |
| Database | SQLAlchemy + SQLite (swap `DATABASE_URL` for Postgres) |
| Real-time | WebSockets |

## Setup

```bash
# From the repo root
cp .env.example .env          # fill in ANTHROPIC_API_KEY
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
│   └── feedback_agent.py # Post-session coaching report via Claude
├── modules/
│   ├── resume_parser.py        # PDF/text extraction + heuristic field structuring
│   ├── role_inferencer.py      # Infers target job roles from resume signals
│   ├── question_generator.py   # Dynamic question generation (Claude API)
│   ├── audio_analyzer.py       # Whisper STT + librosa tone/hesitation analysis
│   ├── video_analyzer.py       # MediaPipe + DeepFace eye contact / expression scoring
│   ├── technical_evaluator.py  # Semantic scoring + keyword/intent matching
│   └── job_recommender.py      # Crawls job boards, ranks by resume match score
├── api/
│   ├── routes/
│   │   ├── resume.py     # POST /resume/upload
│   │   ├── interview.py  # POST /interview/start, POST /interview/answer
│   │   ├── feedback.py   # GET  /feedback/{session_id}
│   │   └── jobs.py       # GET  /jobs
│   └── websocket.py      # ws://.../ws/{session_id} — real-time frame streaming
└── models/
    ├── schemas.py         # Pydantic request/response models
    └── database.py        # SQLAlchemy table definitions
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/resume/upload` | Upload PDF/text resume, returns `CandidateProfile` |
| `POST` | `/interview/start` | Begin session for a candidate profile |
| `POST` | `/interview/answer` | Submit answer chunk, get next question + live scores |
| `GET` | `/interview/{id}` | Fetch current session state |
| `GET` | `/feedback/{session_id}` | Retrieve completed `FeedbackReport` |
| `GET` | `/jobs` | Ranked job recommendations for a session |
| `WS` | `/ws/{session_id}` | Stream audio/video frames, receive real-time scores |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Model ID |
| `DATABASE_URL` | No | `sqlite:///./nexinterview.db` | SQLAlchemy DB URL |
| `WHISPER_MODEL` | No | `base` | Whisper model size (`base`, `small`, `medium`) |

## Running Tests

```bash
uv run pytest
```
