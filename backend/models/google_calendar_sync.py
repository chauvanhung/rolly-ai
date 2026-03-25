from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db.base import Base


class GoogleCalendarSync(Base):
    __tablename__ = "google_calendar_syncs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    utility_bill_id: Mapped[int] = mapped_column(ForeignKey("utility_bills.id"), nullable=False, unique=True, index=True)
    event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="google_calendar_syncs")
    utility_bill = relationship("UtilityBill", back_populates="google_calendar_sync")
