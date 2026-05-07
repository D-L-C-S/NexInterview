from __future__ import annotations

import sys
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── AI / LLM ──────────────────────────────────────────────────────────────
    gemini_api_key: str
    groq_api_key: str

    # ── Job Search ────────────────────────────────────────────────────────────
    rapidapi_key: str

    # ── Database ──────────────────────────────────────────────────────────────
    database_url: str = "sqlite:///./nexinterview.db"

    # ── Misc ──────────────────────────────────────────────────────────────────
    whisper_model: str = "base"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    @field_validator("gemini_api_key", "groq_api_key", "rapidapi_key", mode="before")
    @classmethod
    def _not_empty(cls, v: str, info) -> str:
        if not v or v.strip() in ("", "..."):
            raise ValueError(
                f"{info.field_name.upper()} is missing or placeholder — "
                "add the real value to your .env file."
            )
        return v


def _load() -> Settings:
    try:
        return Settings()
    except Exception as exc:
        print(f"\n[config] Missing required environment variable:\n  {exc}\n", file=sys.stderr)
        sys.exit(1)


settings = _load()
