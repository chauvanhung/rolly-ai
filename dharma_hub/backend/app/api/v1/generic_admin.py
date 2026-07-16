from datetime import datetime, timezone
from io import StringIO

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field, create_model
from sqlalchemy.orm import Session

from app.api.deps import require_permission, require_super_admin
from app.core.db import get_db
from app.models import (
    AuditLog,
    Category,
    CharityProgram,
    DharmaTalk,
    Event,
    Lecture,
    MediaAsset,
    NewsPost,
    Retreat,
    Role,
    Tag,
    Teacher,
    User,
    ContactMessage,
    Subscriber,
)
from app.schemas.common import AuditLogOut, Message, Page
from app.services.audit import safe_snapshot, write_audit
from app.services.crud import apply_list_query, get_or_404, unique_slug, utcnow


class GenericItem(BaseModel):
    id: int
    data: dict


class GenericPayload(BaseModel):
    data: dict = Field(default_factory=dict)


class BulkIds(BaseModel):
    ids: list[int]


def serialize(obj) -> GenericItem:
    data = safe_snapshot(obj) or {}
    data.pop("hashed_password", None)
    return GenericItem(id=obj.id, data=data)


def create_generic_router(*, module: str, model, label: str, search_fields: list[str], allowed_fields: set[str], slug_field: bool = True) -> APIRouter:
    router = APIRouter(prefix=f"/{module}", tags=[module])

    @router.get("", response_model=Page[GenericItem])
    def list_items(
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        search: str | None = None,
        status: str | None = None,
        include_deleted: bool = False,
        only_deleted: bool = False,
        sort: str = "-created_at",
        db: Session = Depends(get_db),
        _: User = Depends(require_permission(f"{module}.view")),
    ):
        filters = {"status": status} if hasattr(model, "status") else {}
        items, total, page, page_size, pages = apply_list_query(
            db, model, page=page, page_size=page_size, search=search, sort=sort,
            include_deleted=include_deleted, only_deleted=only_deleted, filters=filters, search_fields=search_fields,
        )
        return Page[GenericItem](items=[serialize(x) for x in items], total=total, page=page, page_size=page_size, pages=pages)

    @router.post("", response_model=GenericItem, status_code=201)
    def create_item(payload: GenericPayload, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.create"))):
        data = {k: v for k, v in payload.data.items() if k in allowed_fields}
        obj = model()
        for k, v in data.items():
            setattr(obj, k, v)
        if slug_field and hasattr(model, "slug"):
            title = data.get("title") or data.get("name") or label
            obj.slug = unique_slug(db, model, title, data.get("slug"))
        if hasattr(obj, "created_by"):
            obj.created_by = actor.id
            obj.updated_by = actor.id
        db.add(obj)
        db.flush()
        write_audit(db, action="create", module=module, entity_id=obj.id, actor=actor, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.get("/export/csv")
    def export_csv(db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.export"))):
        rows = db.query(model)
        if hasattr(model, "is_deleted"):
            rows = rows.filter(model.is_deleted.is_(False))
        rows = rows.limit(10000).all()
        buf = StringIO()
        cols = [c.name for c in model.__table__.columns if c.name != "hashed_password"]
        buf.write(",".join(cols) + "\n")
        for r in rows:
            vals = []
            for c in cols:
                v = getattr(r, c)
                if hasattr(v, "isoformat"):
                    v = v.isoformat()
                vals.append(str(v if v is not None else "").replace('"', '""'))
            buf.write(",".join(f'"{v}"' for v in vals) + "\n")
        write_audit(db, action="export", module=module, actor=actor, summary=f"Xuất CSV {label}", request=None)
        db.commit()
        return Response(content=buf.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={module}.csv"})

    @router.get("/{item_id}", response_model=GenericItem)
    def get_item(item_id: int, include_deleted: bool = False, db: Session = Depends(get_db), _: User = Depends(require_permission(f"{module}.view"))):
        return serialize(get_or_404(db, model, item_id, include_deleted=include_deleted))

    @router.patch("/{item_id}", response_model=GenericItem)
    def update_item(item_id: int, payload: GenericPayload, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.update"))):
        obj = get_or_404(db, model, item_id)
        before = safe_snapshot(obj)
        data = {k: v for k, v in payload.data.items() if k in allowed_fields}
        if slug_field and hasattr(model, "slug") and ("slug" in data or "title" in data or "name" in data):
            title = data.get("title") or data.get("name") or getattr(obj, "title", getattr(obj, "name", label))
            obj.slug = unique_slug(db, model, title, data.get("slug"), exclude_id=obj.id)
            data.pop("slug", None)
        for k, v in data.items():
            setattr(obj, k, v)
        if hasattr(obj, "updated_by"):
            obj.updated_by = actor.id
        write_audit(db, action="update", module=module, entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.delete("/{item_id}", response_model=Message)
    def delete_item(item_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.delete"))):
        obj = get_or_404(db, model, item_id)
        before = safe_snapshot(obj)
        obj.is_deleted = True
        obj.deleted_at = utcnow()
        obj.deleted_by = actor.id
        write_audit(db, action="delete", module=module, entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
        db.commit()
        return Message(message=f"Đã xóa mềm {label}.")

    @router.post("/{item_id}/restore", response_model=GenericItem)
    def restore_item(item_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.restore"))):
        obj = get_or_404(db, model, item_id, include_deleted=True)
        before = safe_snapshot(obj)
        obj.is_deleted = False
        obj.deleted_at = None
        obj.deleted_by = None
        write_audit(db, action="restore", module=module, entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.delete("/{item_id}/hard", response_model=Message)
    def hard_delete_item(item_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_super_admin)):
        obj = get_or_404(db, model, item_id, include_deleted=True)
        before = safe_snapshot(obj)
        db.delete(obj)
        write_audit(db, action="hard_delete", module=module, entity_id=item_id, actor=actor, before=before, summary=label, request=request)
        db.commit()
        return Message(message=f"Đã xóa vật lý {label}.")

    @router.post("/{item_id}/publish", response_model=GenericItem)
    def publish_item(item_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.publish"))):
        obj = get_or_404(db, model, item_id)
        before = safe_snapshot(obj)
        if hasattr(obj, "status"):
            obj.status = "published"
            obj.published_at = datetime.now(timezone.utc) if hasattr(obj, "published_at") else None
        write_audit(db, action="publish", module=module, entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
        db.commit()
        db.refresh(obj)
        return serialize(obj)

    @router.post("/bulk/delete", response_model=Message)
    def bulk_delete(payload: BulkIds, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission(f"{module}.delete"))):
        count = 0
        for obj in db.query(model).filter(model.id.in_(payload.ids), model.is_deleted.is_(False)).all():
            before = safe_snapshot(obj)
            obj.is_deleted = True
            obj.deleted_at = utcnow()
            obj.deleted_by = actor.id
            write_audit(db, action="delete", module=module, entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=getattr(obj, "title", getattr(obj, "name", label)), request=request)
            count += 1
        db.commit()
        return Message(message=f"Đã xóa mềm {count} dòng.")

    @router.get("/{item_id}/audit", response_model=Page[AuditLogOut])
    def item_audit(item_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), _: User = Depends(require_permission(f"{module}.view"))):
        q = db.query(AuditLog).filter(AuditLog.module == module, AuditLog.entity_id == item_id).order_by(AuditLog.created_at.desc())
        total = q.count()
        items = q.offset((page - 1) * page_size).limit(page_size).all()
        pages = max(1, (total + page_size - 1) // page_size)
        return Page[AuditLogOut](items=items, total=total, page=page, page_size=page_size, pages=pages)

    return router


TEXT_CONTENT_FIELDS = {"title", "slug", "excerpt", "body", "description", "cover_url", "category_id", "tags_csv", "status", "approval_status", "references", "published_at", "scheduled_at", "is_pinned", "attachments_json"}
LECTURE_FIELDS = {"title", "slug", "description", "video_url", "audio_url", "teacher_id", "duration_seconds", "transcript", "timestamps_json", "series_name", "series_order", "attachments_json", "source_channel", "category_id", "tags_csv", "status"}
TEACHER_FIELDS = {"name", "slug", "avatar_url", "bio", "organization", "status"}
EVENT_FIELDS = {"title", "slug", "description", "location", "start_at", "end_at", "recurrence", "capacity", "registration_open", "cover_url", "status"}
RETREAT_FIELDS = EVENT_FIELDS | {"schedule_json", "teacher_id"}
CHARITY_FIELDS = {"title", "slug", "description", "progress_note", "report", "images_json", "documents_json", "total_income", "total_expense", "program_status", "cover_url", "status"}
MEDIA_FIELDS = {"file_name", "title", "description", "kind", "mime_type", "url", "size_bytes", "folder", "tags_csv"}
CATEGORY_FIELDS = {"name", "slug", "description", "module", "parent_id", "sort_order"}
TAG_FIELDS = {"name", "slug"}
ROLE_FIELDS = {"name", "slug", "description"}
CONTACT_FIELDS = {"full_name", "email", "phone", "subject", "body", "is_read"}
SUBSCRIBER_FIELDS = {"email", "full_name", "phone", "interests", "is_active"}

routers = [
    create_generic_router(module="dharma_talks", model=DharmaTalk, label="bài pháp", search_fields=["title", "excerpt", "body"], allowed_fields=TEXT_CONTENT_FIELDS),
    create_generic_router(module="lectures", model=Lecture, label="bài giảng", search_fields=["title", "description", "transcript"], allowed_fields=LECTURE_FIELDS),
    create_generic_router(module="teachers", model=Teacher, label="giảng sư", search_fields=["name", "bio", "organization"], allowed_fields=TEACHER_FIELDS),
    create_generic_router(module="events", model=Event, label="sự kiện", search_fields=["title", "description", "location"], allowed_fields=EVENT_FIELDS),
    create_generic_router(module="retreats", model=Retreat, label="khóa tu", search_fields=["title", "description", "location"], allowed_fields=RETREAT_FIELDS),
    create_generic_router(module="charity_programs", model=CharityProgram, label="chương trình thiện nguyện", search_fields=["title", "description", "report"], allowed_fields=CHARITY_FIELDS),
    create_generic_router(module="news_posts", model=NewsPost, label="tin tức/thông báo", search_fields=["title", "excerpt", "body"], allowed_fields=TEXT_CONTENT_FIELDS),
    create_generic_router(module="media_assets", model=MediaAsset, label="media", search_fields=["file_name", "title", "description", "tags_csv"], allowed_fields=MEDIA_FIELDS, slug_field=False),
    create_generic_router(module="categories", model=Category, label="danh mục", search_fields=["name", "description", "module"], allowed_fields=CATEGORY_FIELDS),
    create_generic_router(module="tags", model=Tag, label="thẻ", search_fields=["name", "slug"], allowed_fields=TAG_FIELDS),
    create_generic_router(module="roles", model=Role, label="vai trò", search_fields=["name", "description"], allowed_fields=ROLE_FIELDS),
    create_generic_router(module="contact_messages", model=ContactMessage, label="tin nhắn liên hệ", search_fields=["full_name", "email", "subject", "body"], allowed_fields=CONTACT_FIELDS, slug_field=False),
    create_generic_router(module="subscribers", model=Subscriber, label="người đăng ký tin", search_fields=["email", "full_name", "phone"], allowed_fields=SUBSCRIBER_FIELDS, slug_field=False),
]
