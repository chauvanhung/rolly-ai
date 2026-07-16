from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PublishMixin, SoftDeleteMixin, TimestampMixin


class Event(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Lich Phat su."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # none | daily | weekly | monthly | yearly
    recurrence: Mapped[str] = mapped_column(String(20), default="none", nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    registration_open: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)

    registrations = relationship(
        "EventRegistration", back_populates="event", cascade="all, delete-orphan"
    )


class EventRegistration(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "event_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)

    event = relationship("Event", back_populates="registrations")


class Retreat(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Khoa tu."""

    __tablename__ = "retreats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    schedule_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    registration_open: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)

    registrations = relationship(
        "RetreatRegistration", back_populates="retreat", cascade="all, delete-orphan"
    )


class RetreatRegistration(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "retreat_registrations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    retreat_id: Mapped[int] = mapped_column(ForeignKey("retreats.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    confirmation_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    retreat = relationship("Retreat", back_populates="registrations")
