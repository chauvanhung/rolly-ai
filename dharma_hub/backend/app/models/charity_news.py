from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, PublishMixin, SoftDeleteMixin, TimestampMixin


class CharityProgram(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Thien nguyen."""

    __tablename__ = "charity_programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    progress_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    report: Mapped[str | None] = mapped_column(Text, nullable=True)
    images_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    documents_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_income: Mapped[float] = mapped_column(Numeric(16, 2), default=0, nullable=False)
    total_expense: Mapped[float] = mapped_column(Numeric(16, 2), default=0, nullable=False)
    # planning | active | completed | closed
    program_status: Mapped[str] = mapped_column(String(20), default="planning", nullable=False, index=True)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)


class NewsPost(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Tin tuc va thong bao."""

    __tablename__ = "news_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tags_csv: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachments_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
