from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "phatgiao"
    app_env: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = Field(default="sqlite:///./dharma_hub.db")
    jwt_secret: str = Field(default="change-me-phatgiao")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "./uploads"
    public_upload_base: str = "/api/uploads"
    max_upload_size_mb: int = 20
    # First registered user becomes Super Admin.
    cors_origins: str = "*"


settings = Settings()

