from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import feedback, interview, jobs, resume
from backend.api.websocket import router as ws_router
from backend.models.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create all SQLite tables on startup (no-op if they already exist)."""
    init_db()
    yield


app = FastAPI(title="NexInterview API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router, prefix="/resume", tags=["resume"])
app.include_router(interview.router, prefix="/interview", tags=["interview"])
app.include_router(feedback.router, prefix="/feedback", tags=["feedback"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])
app.include_router(ws_router, tags=["websocket"])
