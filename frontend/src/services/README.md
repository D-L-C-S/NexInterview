# services/

Backend communication layer — keeps all network calls out of components and hooks.

| File | Description |
|------|-------------|
| `api.ts` | Typed `fetch` wrappers for every REST endpoint (`uploadResume`, `startInterview`, `submitAnswer`, `getFeedback`, `getJobs`) |
| `websocket.ts` | `InterviewSocket` class — connects to the backend WS, sends frame chunks, exposes an `onMessage` callback |

Base URLs are read from `VITE_API_URL` and `VITE_WS_URL` env vars (default: `localhost:8000`).
