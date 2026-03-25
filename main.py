"""
FastAPI application entry point.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.routes import router
from app.automation.scheduler import start_scheduler, stop_scheduler
from app.core.config import settings
from app.core.logger import logger
from app.core.ollama_client import get_ollama_client
from app.rag.vector_store import initialize_vector_store
from app.sql.db import get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Local AI Assistant")

    try:
        initialize_vector_store()
    except Exception as exc:
        logger.error("FAISS initialization failed: %s", exc)

    try:
        get_db()
    except Exception as exc:
        logger.error("SQL initialization failed: %s", exc)

    try:
        start_scheduler()
    except Exception as exc:
        logger.error("Scheduler initialization failed: %s", exc)

    yield

    stop_scheduler()
    await get_ollama_client().close()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Local AI Assistant",
    description="Offline Vietnamese legal QA, text-to-SQL, and automation assistant.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(router, prefix="/api")


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse("index.html")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        workers=1,
        log_level=settings.log_level.lower(),
    )
