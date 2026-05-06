# hooks/

Custom React hooks that encapsulate stateful browser APIs and session logic.

| Hook | Description |
|------|-------------|
| `useInterview` | Manages interview session state; orchestrates API calls and WebSocket lifecycle |
| `useAudio` | Captures microphone input via `MediaRecorder`, chunks and streams audio to the backend |
| `useVideo` | Accesses webcam via `getUserMedia`, samples frames at a configurable interval |
