"""
FastAPI routes.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.ratelimit import enforce as rate_limit
from app.agent.intent_detector import detect_intent
from app.agent.orchestrator import handle_query
from app.automation.scheduler import get_scheduler, list_jobs_payload, schedule_daily_report
from app.core.logger import logger
from app.core.ollama_client import get_ollama_client
from app.rag.vector_store import get_vector_store
from app.sql.db import get_db
from app.tools.telegram import is_telegram_configured

router = APIRouter()


class AskRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    session_id: Optional[str] = None


class AskResponse(BaseModel):
    answer: str
    intent: Optional[str] = None
    session_id: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    ollama_available: bool
    faiss_ready: bool
    faiss_vector_count: int
    sql_available: bool
    scheduled_jobs: int
    telegram_configured: bool


class ScheduleRequest(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(default=0, ge=0, le=59)


@router.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest, http_request: Request) -> AskResponse:
    rate_limit(http_request, "ask", limit=20, window_seconds=60)
    try:
        intent, _confidence = detect_intent(request.message)
        answer = await handle_query(request.message)
        return AskResponse(answer=answer, intent=intent.value, session_id=request.session_id)
    except Exception as exc:
        logger.error("/ask error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    client = get_ollama_client()
    store = get_vector_store()
    db = get_db()
    scheduler = get_scheduler()
    return StatusResponse(
        status="ok",
        ollama_available=await client.is_available(),
        faiss_ready=store.is_ready,
        faiss_vector_count=store.index.ntotal if store.is_ready and store.index else 0,
        sql_available=db.is_available,
        scheduled_jobs=len(scheduler.get_jobs()) if scheduler.running else 0,
        telegram_configured=is_telegram_configured(),
    )


@router.post("/ingest")
async def ingest(http_request: Request) -> dict[str, str]:
    rate_limit(http_request, "ingest", limit=2, window_seconds=300)
    store = get_vector_store()
    ok = store.build_from_documents()
    if ok and store.index is not None:
        return {"status": "success", "message": f"Đã dựng lại chỉ mục với {store.index.ntotal} vectors."}
    return {"status": "warning", "message": "Không có file PDF hoặc DOCX trong data/laws."}


@router.get("/jobs")
async def jobs() -> dict[str, object]:
    payload = list_jobs_payload()
    return {"count": len(payload), "jobs": payload}


@router.post("/schedule")
async def schedule(request: ScheduleRequest, http_request: Request) -> dict[str, str]:
    rate_limit(http_request, "schedule", limit=5, window_seconds=300)
    return {"status": "success", "message": schedule_daily_report(request.hour, request.minute)}
