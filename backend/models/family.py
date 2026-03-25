from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class Family(Base):
    __tablename__ = "families"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    members = relationship("User", back_populates="family")
    transactions = relationship("Transaction", back_populates="family")
    budgets = relationship("Budget", back_populates="family")
