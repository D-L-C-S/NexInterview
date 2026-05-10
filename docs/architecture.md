# NexInterview — Architecture Document

## 1. Problem Summary

NexInterview is an agentic AI-powered mock interview platform. It parses a candidate's
resume to infer realistic job roles, then conducts adaptive, multimodal interview sessions
that evaluate technical competency, communication clarity, and confidence. After the session,
it generates a structured coaching report and recommends matching job listings.

## 2. User Journey

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐
│  Upload  │───▶│  View Role   │───▶│   Interview  │───▶│ Feedback │───▶│   Jobs   │
│  Resume  │    │  & Profile   │    │  (5 Q&A)     │    │  Report  │    │  Board   │
└──────────┘    └──────────────┘    └──────────────┘    └──────────┘    └──────────┘
```

1. **Upload resume** (PDF or text file)
2. **Review profile** — inferred roles, skills, focus areas; confirm target role
3. **Interview session** — answer 5 dynamically generated questions; receive real-time scores
4. **Feedback report** — AI coaching with technical gaps, communication tips, and next steps
5. **Job recommendations** — resume-matched listings from JSearch/RapidAPI

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
│  Upload → Role Confirm → Interview Session → Feedback → Job Board  │
│                                                                     │
│  Browser-side A/V:                                                  │
│    speechHandler.js (Web Speech API) → confidence score             │
│    visionHandler.js (MediaPipe FaceMesh) → engagement score         │
└────────────────────────────┬────────────────────────────────────────┘
                             │  REST (axios) + WebSocket
                             │  Vite proxy: /api → localhost:8000
┌────────────────────────────▼────────────────────────────────────────┐
│                       FastAPI Backend                               │
│                                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Context Agent  │   │   Orchestrator   │   │ Feedback Agent │  │
│  │  (resume →      │   │   (question flow,│   │ (coaching      │  │
│  │   role + focus) │   │    difficulty    │   │  report)       │  │
│  │                 │   │    adaptation)   │   │                │  │
│  └────────┬────────┘   └────────┬─────────┘   └───────┬────────┘  │
│           │                     │                      │           │
│  ┌────────▼────────────────────▼──────────────────────▼────────┐  │
│  │                        Modules                               │  │
│  │  ResumeParser │ RoleInferencer │ QuestionGenerator           │  │
│  │  TechnicalEvaluator │ JobRecommender                        │  │
│  │  AudioAnalyzer (stub) │ VideoAnalyzer (stub)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                        Data Layer                             │  │
│  │  SQLAlchemy ORM → SQLite (candidate_profiles, sessions,      │  │
│  │                           questions, answers)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                │
    Groq API             JSearch API       pdfplumber
   (Llama 3.3 70B)       (RapidAPI)
```

## 4. API Contract

### REST Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| `GET` | `/health` | — | `{ status, version }` |
| `POST` | `/resume/upload` | `multipart/form-data` (file) | `CandidateProfileResponse` |
| `POST` | `/interview/start` | `{ profile_id }` | `{ session_id, question }` |
| `POST` | `/interview/answer` | `{ session_id, question_id, answer_text, confidence_score?, engagement_score? }` | `{ scores, feedback_snippet, next_question, session_complete }` |
| `GET` | `/interview/{id}` | — | `InterviewSessionResponse` |
| `GET` | `/feedback/{session_id}` | — | `FeedbackReportResponse` |
| `GET` | `/jobs?session_id=` | — | `JobMatchResponse[]` |

### WebSocket

`ws://localhost:8000/ws/{session_id}` — real-time audio/video frame delivery (stub).

## 5. Data Flow

```
Resume File
    │
    ▼
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  resume_parser   │────▶│  role_inferencer  │────▶│  CandidateDB   │
│  (pdfplumber +   │     │  (Groq LLM)      │     │  (profile_id)  │
│   Groq LLM)      │     └──────────────────┘     └───────┬────────┘
└─────────────────┘                                        │
                                                           ▼
                                              ┌──────────────────────┐
                                              │   Orchestrator       │
                                              │   (question loop)    │
                                              └──────────┬───────────┘
                                                         │
                                     ┌───────────────────┼───────────────────┐
                                     ▼                   ▼                   ▼
                          ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                          │ question_gen │    │ tech_evaluator│    │ feedback_gen │
                          │ (Groq LLM)  │    │ (Groq LLM)   │    │ (Groq LLM)  │
                          └──────────────┘    └──────────────┘    └──────────────┘
```

## 6. Database Schema

```
candidate_profiles
├── id (PK, UUID)
├── name, email
├── skills_json, experience_years
├── inferred_role, all_roles_json, focus_areas_json
└── created_at

interview_sessions
├── id (PK, UUID)
├── profile_id (FK → candidate_profiles)
├── status ("active" | "completed")
├── questions_total (default 5)
└── created_at, completed_at

questions
├── id (PK, UUID)
├── session_id (FK → interview_sessions)
├── text, category, difficulty
└── asked_at

answers
├── id (PK, UUID)
├── session_id (FK), question_id (FK)
├── answer_text
├── technical_score, depth_score (LLM-scored)
├── confidence_score, engagement_score (A/V)
├── feedback_snippet
└── created_at
```

## 7. Key Design Choices

- **Groq API (Llama 3.3 70B)** for question generation, semantic scoring, and feedback —
  provides fast inference with good quality for real-time interview sessions.
- **Browser-side A/V analysis** — Web Speech API for transcription/confidence,
  MediaPipe FaceMesh for engagement/stress scoring. No server-side ML needed.
- **Adaptive difficulty** — the orchestrator bumps difficulty up if score > 0.75,
  drops it if score < 0.40, keeping candidates in a productive challenge zone.
- **SQLite** for the hackathon demo; swap `DATABASE_URL` to Postgres for production.
- **Vite proxy** — the frontend proxies `/api` → backend, avoiding CORS issues in dev.
- **uv workspace** manages all Python dependencies from the repo root.

## 8. Scoring Aggregation

| Signal | Source | Score Range |
|--------|--------|-------------|
| Technical correctness | Groq LLM semantic eval | 0–1 |
| Depth of knowledge | Groq LLM depth analysis | 0–1 |
| Confidence | Web Speech API (browser) | 0–1 |
| Engagement | MediaPipe FaceMesh (browser) | 0–1 |

The feedback report averages all scores across the session and provides
per-dimension breakdowns plus actionable coaching recommendations.

## 9. Limitations & Assumptions

- Backend audio/video analyzers are stubs — real-time A/V processing happens
  browser-side via Web Speech API and MediaPipe.
- Whisper integration is reserved for future server-side speech processing.
- Job recommendations rely on JSearch (RapidAPI) which has rate limits on free tiers.
- SQLite is single-threaded; use Postgres for concurrent production loads.
- The frontend currently uses text input for answers; voice input hooks exist but
  are not wired into the interview page UI.
