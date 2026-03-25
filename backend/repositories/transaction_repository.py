from datetime import datetime

from sqlalchemy import extract, func, or_
from sqlalchemy.orm import Session

from backend.models.transaction import Transaction


class TransactionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(
        self,
        *,
        user_id: int,
        family_id: int | None,
        type: str,
        amount,
        category: str,
        note: str | None,
        created_at: datetime | None,
    ) -> Transaction:
        transaction = Transaction(
            user_id=user_id,
            family_id=family_id,
            type=type,
            amount=amount,
            category=category,
            note=note,
            created_at=created_at or datetime.utcnow(),
        )
        self.db.add(transaction)
        self.db.flush()
        return transaction

    def list_for_user(
        self,
        *,
        user_id: int,
        family_id: int | None,
        include_family: bool,
        skip: int,
        limit: int,
        search: str | None = None,
        category: str | None = None,
        type: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ):
        query = self.db.query(Transaction)
        if include_family and family_id:
            query = query.filter(or_(Transaction.user_id == user_id, Transaction.family_id == family_id))
        else:
            query = query.filter(Transaction.user_id == user_id)

        if search:
            query = query.filter(
                or_(
                    Transaction.category.ilike(f"%{search}%"),
                    Transaction.note.ilike(f"%{search}%"),
                )
            )
        if category:
            query = query.filter(Transaction.category == category)
        if type:
            query = query.filter(Transaction.type == type)
        if date_from:
            query = query.filter(Transaction.created_at >= date_from)
        if date_to:
            query = query.filter(Transaction.created_at <= date_to)

        return query.order_by(Transaction.created_at.desc()).offset(skip).limit(limit).all()

    def get_for_user(self, transaction_id: int, *, user_id: int, family_id: int | None) -> Transaction | None:
        query = self.db.query(Transaction).filter(Transaction.id == transaction_id)
        if family_id:
            query = query.filter(or_(Transaction.user_id == user_id, Transaction.family_id == family_id))
        else:
            query = query.filter(Transaction.user_id == user_id)
        return query.first()

    def delete(self, transaction: Transaction) -> None:
        self.db.delete(transaction)

    def summary_for_user(self, *, user_id: int, family_id: int | None, include_family: bool):
        query = self.db.query(Transaction)
        if include_family and family_id:
            query = query.filter(or_(Transaction.user_id == user_id, Transaction.family_id == family_id))
        else:
            query = query.filter(Transaction.user_id == user_id)

        totals = (
            query.with_entities(
                func.coalesce(func.sum(Transaction.amount).filter(Transaction.type == "income"), 0).label("income"),
                func.coalesce(func.sum(Transaction.amount).filter(Transaction.type == "expense"), 0).label("expense"),
            )
            .one()
        )

        by_category = (
            query.filter(Transaction.type == "expense")
            .with_entities(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0).label("total"))
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        monthly_trends = (
            query.with_entities(
                extract("year", Transaction.created_at).label("year"),
                extract("month", Transaction.created_at).label("month"),
                func.coalesce(func.sum(Transaction.amount).filter(Transaction.type == "income"), 0).label("income"),
                func.coalesce(func.sum(Transaction.amount).filter(Transaction.type == "expense"), 0).label("expense"),
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )

        return totals, by_category, monthly_trends
