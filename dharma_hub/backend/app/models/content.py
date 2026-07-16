from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, PublishMixin, SoftDeleteMixin, TimestampMixin


class Sutra(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Kinh dien."""

    __tablename__ = "sutras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    sutra_group: Mapped[str | None] = mapped_column(String(150), nullable=True)
    translator: Mapped[str | None] = mapped_column(String(200), nullable=True)
    source: Mapped[str | None] = mapped_column(String(300), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    pdf_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    reading_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tags_csv: Mapped[str | None] = mapped_column(String(500), nullable=True)

    chapters = relationship(
        "SutraChapter", back_populates="sutra", cascade="all, delete-orphan", order_by="SutraChapter.sort_order"
    )


class SutraChapter(Base, TimestampMixin, SoftDeleteMixin):
    """Chuong / pham."""

    __tablename__ = "sutra_chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sutra_id: Mapped[int] = mapped_column(ForeignKey("sutras.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    sutra = relationship("Sutra", back_populates="chapters")


class DharmaTalk(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Bai phap."""

    __tablename__ = "dharma_talks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    references: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tags_csv: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Lecture(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Bai giang (video/audio)."""

    __tablename__ = "lectures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(350), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamps_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    series_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    series_order: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attachments_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_channel: Mapped[str | None] = mapped_column(String(200), nullable=True)
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tags_csv: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Teacher(Base, TimestampMixin, SoftDeleteMixin, PublishMixin):
    """Giang su."""

    __tablename__ = "teachers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(250), unique=True, nullable=False, index=True)
    avatar_url: Mapped[str | None] = mapped_column(String(600), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    organization: Mapped[str | None] = mapped_column(String(250), nullable=True)
