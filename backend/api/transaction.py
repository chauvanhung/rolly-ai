from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user, rate_limit_dependency
from backend.core.config import settings
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.transaction import SummaryResponse, TransactionCreate, TransactionResponse, TransactionUpdate
from backend.services.transaction_service import TransactionService

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(
    payload: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TransactionService(db).create_transaction(current_user, payload)


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=settings.default_page_size, ge=1, le=settings.max_page_size),
    include_family: bool = Query(default=True),
    search: str | None = Query(default=None, min_length=1, max_length=100),
    category: str | None = Query(default=None),
    type: str | None = Query(default=None, pattern="^(income|expense)$"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TransactionService(db).list_transactions(
        current_user,
        page,
        page_size,
        include_family,
        search=search,
        category=category,
        type=type,
        date_from=date_from,
        date_to=date_to,
    )


@router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TransactionService(db).update_transaction(current_user, transaction_id, payload)


@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    TransactionService(db).delete_transaction(current_user, transaction_id)
    return {"message": "Đã xóa giao dịch."}


@router.get("/summary", response_model=SummaryResponse)
def get_summary(
    include_family: bool = Query(default=True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TransactionService(db).get_summary(current_user, include_family)
