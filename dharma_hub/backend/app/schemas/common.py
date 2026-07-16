from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class Message(BaseModel):
    message: str


class AuditLogOut(OrmModel):
    id: int
    actor_id: int | None = None
    actor_email: str | None = None
    action: str
    module: str
    entity_id: int | None = None
    summary: str | None = None
    before_json: str | None = None
    after_json: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    created_at: datetime
