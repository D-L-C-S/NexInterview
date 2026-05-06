# NexInterview

Agentic AI-powered mock interview platform — parses your resume, infers realistic job roles,
and conducts adaptive multimodal interview sessions (audio + video + text).

## Prerequisites

- Python ≥ 3.11 + [uv](https://docs.astral.sh/uv/)
- Node.js ≥ 20 + npm
- `ANTHROPIC_API_KEY` (Claude API)

## Quick Start

```bash
# 1. Clone and enter the repo
git clone https://github.com/D-L-C-S/NexInterview && cd NexInterview

# 2. Copy env file and fill in your API key
cp .env.example .env

# 3. Install Python dependencies (uv manages the workspace)
uv sync

# 4. Run the backend
uv run uvicorn backend.main:app --reload

# 5. In a second terminal, install and run the frontend
cd frontend && npm install && npm run dev
```

Backend: <http://localhost:8000>  
Frontend: <http://localhost:5173>  
API docs: <http://localhost:8000/docs>

## Project Structure

```text
NexInterview/
├── backend/
│   ├── agents/          # Orchestrator, Context, Feedback agents
│   ├── modules/         # Resume parser, audio/video analyzers, evaluators
│   ├── api/             # FastAPI routes + WebSocket handler
│   ├── models/          # Pydantic schemas + SQLAlchemy DB
│   ├── config.py
│   ├── main.py
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── components/  # Interview, Resume, Feedback, Jobs UI
│       ├── pages/       # Route-level page components
│       ├── hooks/       # useInterview, useAudio, useVideo
│       ├── services/    # REST API client + WebSocket client
│       └── types/
├── ml_models/           # Pretrained CV/audio model weights (gitignored)
├── sample_data/         # Example resume + expected output for quick eval
├── docs/                # Architecture document
├── pyproject.toml       # uv workspace root
└── docker-compose.yml
```

## Sample Inputs / Expected Outputs

See [`sample_data/`](sample_data/) for an example resume and the expected scoring output.

## Docker

```bash
docker compose up --build
```
