from datetime import datetime

from sqlalchemy import extract, func, or_
from sqlalchemy.orm import Session

from backend.models.budget import Budget
from backend.models.transaction import Transaction


class BudgetRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, budget: Budget) -> Budget:
        self.db.add(budget)
        self.db.flush()
        return budget

    def list_for_user(self, *, user_id: int, family_id: int | None):
        query = self.db.query(Budget).filter(Budget.user_id == user_id)
        if family_id:
            query = query.filter(or_(Budget.family_id.is_(None), Budget.family_id == family_id))
        return query.order_by(Budget.created_at.desc()).all()

    def get_for_user(self, budget_id: int, *, user_id: int, family_id: int | None) -> Budget | None:
        query = self.db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == user_id)
        if family_id:
            query = query.filter(or_(Budget.family_id.is_(None), Budget.family_id == family_id))
        return query.first()

    def find_by_scope(self, *, user_id: int, family_id: int | None, category: str) -> Budget | None:
        query = self.db.query(Budget).filter(Budget.user_id == user_id, Budget.category == category)
        query = query.filter(Budget.family_id == family_id if family_id else Budget.family_id.is_(None))
        return query.first()

    def delete(self, budget: Budget) -> None:
        self.db.delete(budget)

    def spent_amount_for_budget(self, budget: Budget, *, family_id: int | None) -> float:
        now = datetime.utcnow()
        query = self.db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.type == "expense",
            Transaction.category == budget.category,
            extract("year", Transaction.created_at) == now.year,
            extract("month", Transaction.created_at) == now.month,
        )
        if budget.family_id and family_id:
            query = query.filter(or_(Transaction.user_id == budget.user_id, Transaction.family_id == family_id))
        else:
            query = query.filter(Transaction.user_id == budget.user_id)
        return float(query.scalar() or 0)
