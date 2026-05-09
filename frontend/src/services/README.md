# NexInterview Frontend

React + Vite + TypeScript frontend for the NexInterview AI mock interview platform.

## Quick start

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

By default runs with **mock data** — no backend needed.

## Switch to real backend

1. Make sure backend is running: `http://localhost:8000`
2. Edit `.env.development`:
   ```
   VITE_USE_MOCK=false
   ```
3. Restart dev server.

The Vite proxy rewrites `/api/*` → `http://localhost:8000/*` so no CORS issues.

## Pages & routes

| Route | Page | API call |
|-------|------|----------|
| `/` | Upload resume | `POST /upload-resume` |
| `/roles` | View inferred roles | `GET /infer-roles/:session_id` |
| `/interview` | Live interview | `POST /start-interview`, `POST /submit-answer` |
| `/feedback` | Score report | `GET /feedback/:session_id` |
| `/jobs` | Job recommendations | `GET /job-recommendations/:session_id` |

## Key files

```
src/
├── services/api.ts        ← All API calls + mock responses (start here)
├── types/index.ts         ← TypeScript types matching backend JSON shapes
├── pages/
│   ├── UploadPage.tsx     ← Drag-drop PDF upload
│   ├── RolesPage.tsx      ← Role selection cards
│   ├── InterviewPage.tsx  ← Interview loop + live scores
│   ├── FeedbackPage.tsx   ← Full feedback report
│   └── JobsPage.tsx       ← Ranked job listings
└── App.tsx                ← Routing + nav stepper
```

## Adding audio/video scores

In `InterviewPage.tsx`, the `submitAnswer` call accepts:
```ts
audio_confidence_score?: number   // from your Whisper/audio hook
video_engagement_score?: number   // from your MediaPipe hook
```

Wire these from your `useAudio` and `useVideo` hooks when ready:
```tsx
const { confidenceScore } = useAudio()
const { engagementScore } = useVideo()

await submitAnswer({
  ...payload,
  audio_confidence_score: confidenceScore,
  video_engagement_score: engagementScore,
})
```

## Agent reasoning display

The backend returns `agent_reasoning` with each answer. This is shown as a styled
callout above the next question — it's your key differentiator for the judges.
Make sure the backend populates this meaningfully (e.g., "Candidate struggled with
system design → shifting to OS fundamentals").