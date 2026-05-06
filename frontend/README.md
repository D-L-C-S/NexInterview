# NexInterview — Frontend

React + TypeScript frontend for the NexInterview platform. Provides the resume upload flow,
live interview session UI (webcam + microphone), multimodal score display, post-session
feedback, and job recommendations.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build tool | Vite 6 |
| Routing | React Router v7 |
| Package manager | npm |

## Setup

```bash
cd frontend
npm install
npm run dev
```

App available at <http://localhost:5173>  
Vite proxies `/api` → `http://localhost:8000` (backend must be running).

## Project Layout

```text
frontend/
├── vite.config.ts        # Vite config + /api proxy to backend
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx          # React root mount
    ├── App.tsx           # Route definitions
    ├── index.css         # Global styles
    ├── types/
    │   └── index.ts      # Shared TS types (mirrors backend Pydantic schemas)
    ├── services/
    │   ├── api.ts        # REST client (fetch wrappers for all backend routes)
    │   └── websocket.ts  # WebSocket client for real-time audio/video streaming
    ├── hooks/
    │   ├── useInterview.ts  # Session state + API/WS orchestration
    │   ├── useAudio.ts      # Microphone capture + audio chunk streaming
    │   └── useVideo.ts      # Webcam access + frame sampling
    ├── pages/
    │   ├── LandingPage.tsx    # Hero + feature overview + CTA
    │   ├── UploadPage.tsx     # Resume upload → role inference → confirm
    │   ├── InterviewPage.tsx  # Live session layout
    │   ├── FeedbackPage.tsx   # Post-session report
    │   └── JobsPage.tsx       # Matched job listings
    └── components/
        ├── Resume/
        │   ├── UploadResume.tsx    # Drag-and-drop PDF/text upload
        │   └── RoleInference.tsx   # Displays inferred roles + focus areas
        ├── Interview/
        │   ├── VideoFeed.tsx       # Webcam preview with engagement overlay
        │   ├── QuestionPanel.tsx   # Current question + difficulty badge
        │   ├── ResponseInput.tsx   # Voice record toggle + text fallback
        │   └── ScoreDisplay.tsx    # Real-time score bars (4 dimensions)
        ├── Feedback/
        │   ├── FeedbackReport.tsx  # Full coaching report (gaps, tips, next steps)
        │   └── ScoreCard.tsx       # Average score summary card
        └── Jobs/
            └── JobRecommendations.tsx  # Ranked job list with match reasons
```

## Page Flow

```text
LandingPage → UploadPage → InterviewPage → FeedbackPage → JobsPage
```

## Environment Variables

Create a `.env` file in the **repo root** (Vite picks up `VITE_*` vars automatically):

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend REST base URL |
| `VITE_WS_URL` | `ws://localhost:8000` | Backend WebSocket base URL |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
