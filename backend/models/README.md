# models/

Data layer — Pydantic schemas for request/response validation and SQLAlchemy table definitions.

| File | Contents |
|------|---------|
| `schemas.py` | `CandidateProfile`, `InterviewSession`, `QuestionResult`, `MultimodalScore`, `FeedbackReport`, `JobMatch` |
| `database.py` | SQLAlchemy engine + session factory; tables: `sessions`, `questions`, `scores`, `feedback` |

The default database is SQLite (`nexinterview.db`). Set `DATABASE_URL` in `.env` to switch to PostgreSQL.
