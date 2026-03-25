from sqlalchemy.orm import Session

from backend.models.category_rule import CategoryRule


class CategoryRuleRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, rule: CategoryRule) -> CategoryRule:
        self.db.add(rule)
        self.db.flush()
        return rule

    def list_for_user(self, user_id: int):
        return self.db.query(CategoryRule).filter(CategoryRule.user_id == user_id).order_by(CategoryRule.created_at.desc()).all()

    def list_active_for_user(self, user_id: int):
        return (
            self.db.query(CategoryRule)
            .filter(CategoryRule.user_id == user_id, CategoryRule.is_active.is_(True))
            .order_by(CategoryRule.created_at.desc())
            .all()
        )

    def get_for_user(self, rule_id: int, user_id: int) -> CategoryRule | None:
        return self.db.query(CategoryRule).filter(CategoryRule.id == rule_id, CategoryRule.user_id == user_id).first()

    def delete(self, rule: CategoryRule) -> None:
        self.db.delete(rule)
