# NexInterview

Agentic AI-powered mock interview platform — parses your resume, infers realistic job roles,
and conducts adaptive multimodal interview sessions with real-time scoring and coaching.

## Features

- **📄 Smart Resume Parsing** — Upload a PDF or text resume; Groq LLM extracts skills, experience, and projects
- **🎯 Role Inference** — Automatically identifies your best-fit job titles and generates tailored interview focus areas
- **🤖 Adaptive Interview Engine** — 5 dynamically generated questions that adjust difficulty based on your performance
- **📊 Real-Time Scoring** — Technical correctness, depth, confidence, and engagement scored after every answer
- **📝 AI Coaching Report** — Post-session feedback with technical gaps, communication tips, and actionable next steps
- **💼 Job Recommendations** — Live job listings matched to your inferred role via JSearch API

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 5, Vite 6, React Router v7 |
| **Backend** | FastAPI, Uvicorn, Python 3.11+ |
| **LLM** | Groq API (Llama 3.3 70B) |
| **Speech** | Web Speech API (browser-side) |
| **Vision** | MediaPipe FaceMesh (browser-side) |
| **Resume Parsing** | pdfplumber |
| **Database** | SQLAlchemy + SQLite |
| **Job Search** | JSearch via RapidAPI |
| **Package Mgmt** | uv (Python), npm (frontend) |

## Prerequisites

- Python ≥ 3.11 + [uv](https://docs.astral.sh/uv/)
- Node.js ≥ 20 + npm
- API keys: `GROQ_API_KEY`, `RAPIDAPI_KEY`

## Quick Start

```bash
# 1. Clone and enter the repo
git clone https://github.com/D-L-C-S/NexInterview && cd NexInterview

# 2. Copy env file and fill in your API keys
cp .env.example .env
# → Set GROQ_API_KEY and RAPIDAPI_KEY in .env

# 3. Install Python dependencies (uv manages the workspace)
uv sync
# (optional) server-side A/V libs — whisper, mediapipe, deepface; large downloads
# uv sync --extra ml

# 4. Run the backend
uv run uvicorn backend.main:app --reload

# 5. In a second terminal, install and run the frontend
cd frontend && npm install && npm run dev
```

Backend: <http://localhost:8000>
Frontend: <http://localhost:5173>
API docs: <http://localhost:8000/docs>
Health check: <http://localhost:8000/health>

## Project Structure

```text
NexInterview/
├── backend/
│   ├── main.py              # FastAPI app + router registration
│   ├── config.py            # Settings (pydantic-settings, loads .env)
│   ├── agents/
│   │   ├── orchestrator.py  # Interview loop: question flow + difficulty adaptation
│   │   ├── context_agent.py # Resume → CandidateProfile pipeline
│   │   └── feedback_agent.py# Post-session coaching report (Groq LLM)
│   ├── modules/
│   │   ├── resume_parser.py       # PDF/text → structured data via Groq
│   │   ├── role_inferencer.py     # Infers job roles + focus areas
│   │   ├── question_generator.py  # Dynamic question generation
│   │   ├── technical_evaluator.py # Semantic scoring of answers
│   │   ├── job_recommender.py     # JSearch API integration
│   │   ├── audio_analyzer.py      # (stub) Whisper + librosa
│   │   └── video_analyzer.py      # (stub) MediaPipe + DeepFace
│   ├── api/
│   │   ├── routes/
│   │   │   ├── resume.py    # POST /resume/upload
│   │   │   ├── interview.py # POST /interview/start, /answer, GET /{id}
│   │   │   ├── feedback.py  # GET /feedback/{session_id}
│   │   │   └── jobs.py      # GET /jobs?session_id=
│   │   └── websocket.py     # ws://…/ws/{session_id}
│   └── models/
│       ├── schemas.py       # Pydantic request/response schemas
│       └── database.py      # SQLAlchemy ORM + SQLite
├── frontend/
│   └── src/
│       ├── App.tsx           # React Router routes
│       ├── pages/            # LandingPage, UploadPage, InterviewPage, FeedbackPage, JobsPage
│       ├── services/
│       │   ├── api.ts        # REST client (all backend routes)
│       │   └── websocket.ts  # WebSocket client
│       ├── hooks/            # useInterview, useAudio, useVideo
│       ├── types/            # TypeScript types (mirrors Pydantic schemas)
│       └── utils/            # speechHandler.js, visionHandler.js
├── ml_models/                # Pretrained model weights (gitignored)
├── sample_data/              # Example resume + expected output
├── docs/                     # Architecture document
├── docker-compose.yml
├── pyproject.toml            # uv workspace root
└── requirements.txt
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness probe — returns `{ status: "ok" }` |
| `POST` | `/resume/upload` | Upload PDF/text resume → `CandidateProfileResponse` |
| `POST` | `/interview/start` | Begin 5-question session → `StartInterviewResponse` |
| `POST` | `/interview/answer` | Submit answer → scores + next question |
| `GET` | `/interview/{id}` | Fetch session state with all Q&A results |
| `GET` | `/feedback/{session_id}` | Generate AI coaching report |
| `GET` | `/jobs?session_id=` | Matched job listings from JSearch |
| `WS` | `/ws/{session_id}` | Real-time audio/video frame streaming |

## User Flow

```
Upload Resume → View Profile & Roles → Start Interview → Answer 5 Questions → View Feedback → Browse Jobs
```

## Sample Inputs / Expected Outputs

See [`sample_data/`](sample_data/) for an example resume and the expected scoring output.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Groq API key for LLM |
| `RAPIDAPI_KEY` | Yes | — | RapidAPI key for JSearch job search |
| `GEMINI_API_KEY` | No | — | Google Gemini API key (reserved) |
| `DATABASE_URL` | No | `sqlite:///./nexinterview.db` | SQLAlchemy database URL |
| `WHISPER_MODEL` | No | `base` | Whisper model size |
| `VITE_API_URL` | No | `http://localhost:8000` | Frontend → backend URL |
| `VITE_WS_URL` | No | `ws://localhost:8000` | Frontend → backend WebSocket URL |

## Docker

```bash
docker compose up --build
```

## Team

| Person | Responsibility |
|--------|---------------|
| Person 1 | Resume + AI brain (parser, role inference, question gen, evaluation, feedback, jobs) |
| Person 2 | Audio + video signals (speech handler, vision handler, browser-side A/V analysis) |
| Person 3 | Frontend + UX (React pages, components, hooks, services) |
| Person 4 | Infra + integration (API glue, orchestrator, session state, docs, architecture) |
