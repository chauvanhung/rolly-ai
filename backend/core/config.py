from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Expense SaaS"
    app_env: str = "development"
    secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"
    postgres_user: str = "expense_user"
    postgres_password: str = "expense_password"
    postgres_db: str = "expense_saas"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    database_url: str | None = None
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_llm_model: str = "qwen2.5:7b-instruct"
    ollama_vision_model: str = "moondream:v2"
    ai_max_tokens: int = 256
    ai_request_timeout: int = 45
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_calendar_redirect_uri: str = "http://127.0.0.1:8000/api/google-calendar/callback"
    frontend_base_url: str = "http://localhost:5173"
    default_page_size: int = 20
    max_page_size: int = 100
    rate_limit_requests: int = 60
    rate_limit_window_seconds: int = 60

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def sqlalchemy_database_uri(self) -> str:
        if self.database_url:
            return self.database_url
        if self.app_env.lower() in {"development", "local"}:
            sqlite_path = Path(__file__).resolve().parents[1] / "expense_saas.db"
            return f"sqlite:///{sqlite_path.as_posix()}"
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
