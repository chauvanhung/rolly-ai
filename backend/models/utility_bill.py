from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class UtilityBill(Base):
    __tablename__ = "utility_bills"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_code: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="Hóa đơn")
    preferred_payment_method: Mapped[str] = mapped_column(String(40), nullable=False, default="MoMo")
    estimated_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    due_day: Mapped[int] = mapped_column(nullable=False, default=10)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="utility_bills")
    google_calendar_sync = relationship("GoogleCalendarSync", back_populates="utility_bill", uselist=False, cascade="all, delete-orphan")
