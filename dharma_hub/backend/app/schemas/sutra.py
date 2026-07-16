from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl

from app.schemas.common import OrmModel


class SutraChapterBase(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    body: str | None = None
    audio_url: str | None = None
    sort_order: int = 0


class SutraChapterCreate(SutraChapterBase):
    pass


class SutraChapterUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = None
    audio_url: str | None = None
    sort_order: int | None = None


class SutraChapterOut(OrmModel):
    id: int
    title: str
    body: str | None = None
    audio_url: str | None = None
    sort_order: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class SutraBase(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    slug: str | None = Field(default=None, max_length=350)
    sutra_group: str | None = None
    translator: str | None = None
    source: str | None = None
    summary: str | None = None
    body: str | None = None
    cover_url: str | None = None
    audio_url: str | None = None
    pdf_url: str | None = None
    reading_minutes: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    tags_csv: str | None = None
    status: str = Field(default="draft", pattern="^(draft|pending|published|hidden)$")


class SutraCreate(SutraBase):
    chapters: list[SutraChapterCreate] = []


class SutraUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    slug: str | None = Field(default=None, max_length=350)
    sutra_group: str | None = None
    translator: str | None = None
    source: str | None = None
    summary: str | None = None
    body: str | None = None
    cover_url: str | None = None
    audio_url: str | None = None
    pdf_url: str | None = None
    reading_minutes: int | None = Field(default=None, ge=0)
    category_id: int | None = None
    tags_csv: str | None = None
    status: str | None = Field(default=None, pattern="^(draft|pending|published|hidden)$")


class SutraOut(OrmModel):
    id: int
    title: str
    slug: str
    sutra_group: str | None = None
    translator: str | None = None
    source: str | None = None
    summary: str | None = None
    body: str | None = None
    cover_url: str | None = None
    audio_url: str | None = None
    pdf_url: str | None = None
    reading_minutes: int | None = None
    category_id: int | None = None
    tags_csv: str | None = None
    status: str
    published_at: datetime | None = None
    is_deleted: bool
    deleted_at: datetime | None = None
    deleted_by: int | None = None
    created_at: datetime
    updated_at: datetime
    chapters: list[SutraChapterOut] = []
