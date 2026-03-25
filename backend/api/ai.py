from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, rate_limit_dependency
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.ai import AIActionResponse, AILogRequest, AIResponse
from backend.services.ai_service import AIService

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.get("/ai", response_model=AIResponse)
def ask_ai(
    q: str = Query(..., min_length=2),
    include_family: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AIService(db).answer(current_user, q, include_family)


@router.post("/ai/log", response_model=AIActionResponse)
def log_by_ai(
    payload: AILogRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AIService(db).execute_command(current_user, payload.message, payload.shared_with_family, payload.tone)
