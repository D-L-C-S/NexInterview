# NexInterview — Architecture Document

## Problem Summary
NexInterview is an agentic AI-powered mock interview platform. It parses a candidate's
resume to infer realistic job roles, then conducts adaptive, multimodal interview sessions
that evaluate technical competency, communication clarity, and confidence.

## User Journey
1. Upload resume (PDF/text)
2. Review inferred roles and focus areas; confirm target role
3. Enter live interview session (webcam + microphone)
4. Answer dynamically generated questions; receive real-time scores
5. View post-session feedback report with actionable coaching
6. Browse resume-matched job recommendations

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
│  Upload → Role Confirm → Interview Session → Feedback → Job Board  │
└────────────────────────────┬────────────────────────────────────────┘
                             │  REST + WebSocket
┌────────────────────────────▼────────────────────────────────────────┐
│                       FastAPI Backend                               │
│                                                                     │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Context Agent  │   │   Orchestrator   │   │ Feedback Agent │  │
│  │  (resume →      │   │   (question flow,│   │ (coaching      │  │
│  │   role + focus) │   │    difficulty)   │   │  report)       │  │
│  └────────┬────────┘   └────────┬─────────┘   └───────┬────────┘  │
│           │                     │                      │           │
│  ┌────────▼────────────────────▼──────────────────────▼────────┐  │
│  │                        Modules                               │  │
│  │  ResumeParser │ RoleInferencer │ QuestionGenerator           │  │
│  │  AudioAnalyzer │ VideoAnalyzer │ TechnicalEvaluator          │  │
│  │  JobRecommender                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
         │              │                │
    Claude API     Whisper+librosa   MediaPipe/DeepFace
```

## Key Design Choices
- **Claude API** for question generation, semantic scoring, and feedback — prompt-cached
  system prompts keep latency low across a session.
- **Pretrained CV models** (MediaPipe face mesh + DeepFace) over LLMs for video analysis,
  per the problem statement guidance.
- **WebSockets** for real-time audio/video frame delivery; REST for session lifecycle.
- **SQLite** for the hackathon; swap `DATABASE_URL` to Postgres for production.
- **uv** workspace manages all Python dependencies from the repo root.

## Scoring Aggregation
| Signal | Source | Score |
|--------|--------|-------|
| Technical correctness | Claude semantic eval + keyword match | 0–1 |
| Confidence | librosa pitch variance + pause detection | 0–1 |
| Communication | Speech rate, filler word count, clarity | 0–1 |
| Engagement | MediaPipe eye contact + DeepFace affect | 0–1 |

Final report weights: Technical 40%, Communication 25%, Confidence 20%, Engagement 15%.

## Limitations & Assumptions
- Real-time CV analysis may lag on low-end hardware; frame sampling rate is configurable.
- Whisper `base` model used by default for speed; swap to `small`/`medium` for accuracy.
- Job recommendations rely on third-party job board APIs (rate-limited in free tiers).
