from sqlalchemy.orm import Session

from backend.models.savings_goal import SavingsGoal


class SavingsGoalRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, goal: SavingsGoal) -> SavingsGoal:
        self.db.add(goal)
        self.db.flush()
        return goal

    def list_for_user(self, user_id: int):
        return self.db.query(SavingsGoal).filter(SavingsGoal.user_id == user_id).order_by(SavingsGoal.created_at.desc()).all()

    def get_for_user(self, goal_id: int, user_id: int) -> SavingsGoal | None:
        return self.db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user_id).first()

    def delete(self, goal: SavingsGoal) -> None:
        self.db.delete(goal)
