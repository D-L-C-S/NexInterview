# components/

Reusable UI components grouped by feature area.

## Interview/
Live session UI displayed on `InterviewPage`.

| Component | Description |
|-----------|-------------|
| `VideoFeed` | Webcam preview with engagement/stress overlay |
| `QuestionPanel` | Current question text + difficulty badge |
| `ResponseInput` | Voice-record toggle with optional text fallback |
| `ScoreDisplay` | Real-time bar charts for all four score dimensions |

## Resume/
Used on `UploadPage` during the resume-to-profile flow.

| Component | Description |
|-----------|-------------|
| `UploadResume` | Drag-and-drop PDF/text file picker |
| `RoleInference` | Displays inferred roles, skills, and focus areas for confirmation |

## Feedback/
Used on `FeedbackPage` after a completed session.

| Component | Description |
|-----------|-------------|
| `FeedbackReport` | Full coaching output: technical gaps, communication tips, next steps |
| `ScoreCard` | Summary card with average scores across all four dimensions |

## Jobs/
Used on `JobsPage`.

| Component | Description |
|-----------|-------------|
| `JobRecommendations` | Ranked job list with match score and highlighted fit reasons |
