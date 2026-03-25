from sqlalchemy.orm import Session

from backend.models.user import User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, *, email: str, full_name: str, password_hash: str, family_id: int | None = None) -> User:
        user = User(email=email, full_name=full_name, password_hash=password_hash, family_id=family_id)
        self.db.add(user)
        self.db.flush()
        return user

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: int) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()
