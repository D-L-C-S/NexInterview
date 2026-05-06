# api/

FastAPI routers and WebSocket handler — thin HTTP layer that delegates to agents/modules.

## Routes (`routes/`)

| File | Prefix | Endpoints |
|------|--------|-----------|
| `resume.py` | `/resume` | `POST /upload` — parse resume, return `CandidateProfile` |
| `interview.py` | `/interview` | `POST /start`, `POST /answer`, `GET /{id}` |
| `feedback.py` | `/feedback` | `GET /{session_id}` — fetch completed `FeedbackReport` |
| `jobs.py` | `/jobs` | `GET /?session_id=...` — ranked job recommendations |

## WebSocket (`websocket.py`)

`ws://…/ws/{session_id}` — bidirectional stream used during a live interview session.  
Client sends audio/video frame chunks; server replies with updated scores and the next question.
