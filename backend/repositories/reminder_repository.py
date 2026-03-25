from sqlalchemy.orm import Session

from backend.models.reminder import Reminder


class ReminderRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, reminder: Reminder) -> Reminder:
        self.db.add(reminder)
        self.db.flush()
        return reminder

    def list_for_user(self, user_id: int):
        return self.db.query(Reminder).filter(Reminder.user_id == user_id).order_by(Reminder.due_date.asc()).all()

    def get_for_user(self, reminder_id: int, user_id: int) -> Reminder | None:
        return self.db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user_id).first()

    def delete(self, reminder: Reminder) -> None:
        self.db.delete(reminder)
