from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    claude_model: str = "claude-sonnet-4-6"
    database_url: str = "sqlite:///./nexinterview.db"
    whisper_model: str = "base"

    class Config:
        env_file = ".env"


settings = Settings()
