from sqlalchemy.orm import Session

from backend.models.utility_bill import UtilityBill


class UtilityBillRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, bill: UtilityBill) -> UtilityBill:
        self.db.add(bill)
        self.db.flush()
        return bill

    def list_for_user(self, user_id: int):
        return self.db.query(UtilityBill).filter(UtilityBill.user_id == user_id).order_by(UtilityBill.provider.asc()).all()

    def get_for_user(self, bill_id: int, user_id: int) -> UtilityBill | None:
        return self.db.query(UtilityBill).filter(UtilityBill.id == bill_id, UtilityBill.user_id == user_id).first()

    def delete(self, bill: UtilityBill) -> None:
        self.db.delete(bill)
