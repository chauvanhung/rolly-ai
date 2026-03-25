from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    family_id: Mapped[int | None] = mapped_column(ForeignKey("families.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    family = relationship("Family", back_populates="members")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    savings_goals = relationship("SavingsGoal", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")
    category_rules = relationship("CategoryRule", back_populates="user", cascade="all, delete-orphan")
    utility_bills = relationship("UtilityBill", back_populates="user", cascade="all, delete-orphan")
    google_calendar_account = relationship("GoogleCalendarAccount", back_populates="user", uselist=False, cascade="all, delete-orphan")
    google_calendar_syncs = relationship("GoogleCalendarSync", back_populates="user", cascade="all, delete-orphan")
