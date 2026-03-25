"""
Application configuration loaded from `.env`.
"""
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_llm_model: str = Field(default="llama3:8b", alias="OLLAMA_LLM_MODEL")
    ollama_embed_model: str = Field(default="nomic-embed-text", alias="OLLAMA_EMBED_MODEL")

    sql_connection_string: str = Field(default="", alias="SQL_CONNECTION_STRING")
    sql_readonly: bool = Field(default=True, alias="SQL_READONLY")
    sql_schema_path: str = Field(default="data/schema.sql", alias="SQL_SCHEMA_PATH")
    sql_result_limit: int = Field(default=100, alias="SQL_RESULT_LIMIT")

    faiss_index_path: str = Field(default="data/faiss_index", alias="FAISS_INDEX_PATH")
    laws_dir: str = Field(default="data/laws", alias="LAWS_DIR")
    chunk_size: int = Field(default=400, alias="CHUNK_SIZE")
    chunk_overlap: int = Field(default=50, alias="CHUNK_OVERLAP")
    rag_top_k: int = Field(default=2, alias="RAG_TOP_K")
    max_index_chunks: int = Field(default=8000, alias="MAX_INDEX_CHUNKS")
    focused_index_ratio: float = Field(default=0.7, alias="FOCUSED_INDEX_RATIO")
    retrieval_fetch_k: int = Field(default=40, alias="RETRIEVAL_FETCH_K")

    max_tokens: int = Field(default=512, alias="MAX_TOKENS")
    temperature: float = Field(default=0.1, alias="TEMPERATURE")

    telegram_enabled: bool = Field(default=False, alias="TELEGRAM_ENABLED")
    telegram_token: str = Field(default="", alias="TELEGRAM_TOKEN")
    telegram_chat_id: str = Field(default="", alias="TELEGRAM_CHAT_ID")

    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_file: str = Field(default="logs/app.log", alias="LOG_FILE")

    scheduler_timezone: str = Field(default="Asia/Ho_Chi_Minh", alias="SCHEDULER_TIMEZONE")
    daily_report_hour: int = Field(default=8, alias="DAILY_REPORT_HOUR")
    daily_report_minute: int = Field(default=0, alias="DAILY_REPORT_MINUTE")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "populate_by_name": True,
    }


settings = Settings()
