from datetime import datetime, timezone
from math import ceil
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session


def utcnow():
    return datetime.now(timezone.utc)


def make_slug(text: str) -> str:
    import re
    import unicodedata

    text = text.replace("Đ", "D").replace("đ", "d")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "item"


def unique_slug(db: Session, model, title: str, slug: str | None = None, exclude_id: int | None = None) -> str:
    base = make_slug(slug or title)
    candidate = base
    i = 2
    while True:
        q = db.query(model).filter(model.slug == candidate)
        if exclude_id is not None:
            q = q.filter(model.id != exclude_id)
        if not q.first():
            return candidate
        candidate = f"{base}-{i}"
        i += 1


def apply_list_query(
    db: Session,
    model,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    sort: str = "-created_at",
    include_deleted: bool = False,
    only_deleted: bool = False,
    filters: dict[str, Any] | None = None,
    search_fields: list[str] | None = None,
):
    page = max(1, page)
    page_size = min(max(1, page_size), 100)
    q = db.query(model)
    if hasattr(model, "is_deleted"):
        if only_deleted:
            q = q.filter(model.is_deleted.is_(True))
        elif not include_deleted:
            q = q.filter(model.is_deleted.is_(False))
    if search and search_fields:
        term = f"%{search.strip()}%"
        clauses = [getattr(model, f).ilike(term) for f in search_fields if hasattr(model, f)]
        if clauses:
            q = q.filter(or_(*clauses))
    for key, value in (filters or {}).items():
        if value is None or value == "" or not hasattr(model, key):
            continue
        q = q.filter(getattr(model, key) == value)
    total = q.count()
    sort_desc = sort.startswith("-")
    sort_field = sort[1:] if sort_desc else sort
    if hasattr(model, sort_field):
        q = q.order_by(desc(getattr(model, sort_field)) if sort_desc else asc(getattr(model, sort_field)))
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total, page, page_size, max(1, ceil(total / page_size))


def get_or_404(db: Session, model, item_id: int, include_deleted: bool = False):
    obj = db.get(model, item_id)
    if not obj or (hasattr(obj, "is_deleted") and obj.is_deleted and not include_deleted):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u.")
    return obj

