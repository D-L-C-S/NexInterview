# pages/

Route-level page components — one file per route, composed from `components/`.

| File | Route | Description |
|------|-------|-------------|
| `LandingPage.tsx` | `/` | Hero section, feature overview, CTA to upload resume |
| `UploadPage.tsx` | `/upload` | Resume upload → role inference → role confirmation → start interview |
| `InterviewPage.tsx` | `/interview/:sessionId` | Live session: webcam + question + response + real-time scores |
| `FeedbackPage.tsx` | `/feedback/:sessionId` | Post-session: score card + coaching report + link to jobs |
| `JobsPage.tsx` | `/jobs` | Resume-matched job listings ranked by match score |
