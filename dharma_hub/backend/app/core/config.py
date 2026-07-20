from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "phatgiao"
    app_env: str = "production"
    api_prefix: str = "/api/v1"
    database_url: str = Field(default="sqlite:///./dharma_hub.db")
    jwt_secret: str = Field(default="change-me-phatgiao")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "./uploads"
    public_upload_base: str = "/api/uploads"
    max_upload_size_mb: int = 80
    # Comma-separated. Production ignores "*" and falls back to frontend_base_url.
    cors_origins: str = "https://phatgiao.rollyhub.com,http://127.0.0.1:3015,http://localhost:3015"
    # OAuth redirect (giống app.rollyhub.com) — không phụ thuộc Authorized JavaScript origins
    google_client_id: str = ""
    google_client_secret: str = ""
    google_auth_redirect_uri: str = "https://phatgiao.rollyhub.com/api/v1/auth/google/callback"
    frontend_base_url: str = "https://phatgiao.rollyhub.com"
    # Public write API rate limit (per IP)
    public_rate_limit: int = 5
    public_rate_window_seconds: int = 60
    enable_demo_admin: bool = False
    demo_admin_email: str = ""
    demo_admin_password: str = ""


settings = Settings()

