import secrets

from sqlalchemy.orm import Session

from backend.models.family import Family


class FamilyRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, name: str) -> Family:
        family = Family(name=name, invite_code=secrets.token_hex(4).upper())
        self.db.add(family)
        self.db.flush()
        return family

    def get(self, family_id: int) -> Family | None:
        return self.db.query(Family).filter(Family.id == family_id).first()

    def get_by_invite_code(self, invite_code: str) -> Family | None:
        return self.db.query(Family).filter(Family.invite_code == invite_code).first()
