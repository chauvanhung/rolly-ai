from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models.user import User
from backend.repositories.transaction_repository import TransactionRepository
from backend.schemas.transaction import SummaryResponse, TransactionCreate, TransactionUpdate


class TransactionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = TransactionRepository(db)

    def create_transaction(self, current_user: User, payload: TransactionCreate):
        family_id = current_user.family_id if payload.shared_with_family else None
        transaction = self.repo.create(
            user_id=current_user.id,
            family_id=family_id,
            type=payload.type,
            amount=payload.amount,
            category=payload.category,
            note=payload.note,
            created_at=payload.created_at,
        )
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def list_transactions(
        self,
        current_user: User,
        page: int,
        page_size: int,
        include_family: bool,
        *,
        search: str | None = None,
        category: str | None = None,
        type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ):
        page_size = min(page_size, settings.max_page_size)
        skip = max(page - 1, 0) * page_size
        return self.repo.list_for_user(
            user_id=current_user.id,
            family_id=current_user.family_id,
            include_family=include_family,
            skip=skip,
            limit=page_size,
            search=search,
            category=category,
            type=type,
            date_from=date_from,
            date_to=date_to,
        )

    def update_transaction(self, current_user: User, transaction_id: int, payload: TransactionUpdate):
        transaction = self.repo.get_for_user(transaction_id, user_id=current_user.id, family_id=current_user.family_id)
        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay giao dich.")

        updates = payload.model_dump(exclude_unset=True)
        if "shared_with_family" in updates:
            shared = updates.pop("shared_with_family")
            transaction.family_id = current_user.family_id if shared else None
        for field, value in updates.items():
            setattr(transaction, field, value)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction

    def delete_transaction(self, current_user: User, transaction_id: int) -> None:
        transaction = self.repo.get_for_user(
            transaction_id,
            user_id=current_user.id,
            family_id=current_user.family_id,
        )
        if not transaction:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay giao dich.")
        self.repo.delete(transaction)
        self.db.commit()

    def get_summary(self, current_user: User, include_family: bool) -> SummaryResponse:
        totals, by_category, monthly_trends = self.repo.summary_for_user(
            user_id=current_user.id,
            family_id=current_user.family_id,
            include_family=include_family,
        )
        total_income = Decimal(str(totals.income))
        total_expense = Decimal(str(totals.expense))
        return SummaryResponse(
            total_income=total_income,
            total_expense=total_expense,
            balance=total_income - total_expense,
            by_category=[{"category": row.category, "total": Decimal(str(row.total))} for row in by_category],
            monthly_trends=[
                {
                    "month": f"{int(row.year)}-{int(row.month):02d}",
                    "income": Decimal(str(row.income)),
                    "expense": Decimal(str(row.expense)),
                }
                for row in monthly_trends
            ],
        )
