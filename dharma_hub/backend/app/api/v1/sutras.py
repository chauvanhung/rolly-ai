from datetime import datetime, timezone
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import require_permission, require_super_admin
from app.core.db import get_db
from app.models import AuditLog, Sutra, SutraChapter, User
from app.schemas.common import AuditLogOut, Message, Page
from app.schemas.sutra import SutraChapterCreate, SutraChapterOut, SutraChapterUpdate, SutraCreate, SutraOut, SutraUpdate
from app.services.audit import safe_snapshot, write_audit
from app.services.crud import apply_list_query, get_or_404, unique_slug, utcnow

router = APIRouter(prefix="/sutras", tags=["sutras"])


def _set_fields(obj, payload, *, skip_none: bool = True):
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k == "chapters":
            continue
        if skip_none and v is None:
            continue
        if hasattr(obj, k):
            setattr(obj, k, v)


@router.get("", response_model=Page[SutraOut])
def list_sutras(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    category_id: int | None = None,
    include_deleted: bool = False,
    only_deleted: bool = False,
    sort: str = "-created_at",
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("sutras.view")),
) -> Page[SutraOut]:
    items, total, page, page_size, pages = apply_list_query(
        db,
        Sutra,
        page=page,
        page_size=page_size,
        search=search,
        sort=sort,
        include_deleted=include_deleted,
        only_deleted=only_deleted,
        filters={"status": status, "category_id": category_id},
        search_fields=["title", "summary", "translator", "source", "tags_csv"],
    )
    return Page[SutraOut](items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=SutraOut, status_code=201)
def create_sutra(
    payload: SutraCreate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("sutras.create")),
) -> SutraOut:
    obj = Sutra()
    _set_fields(obj, payload)
    obj.slug = unique_slug(db, Sutra, payload.title, payload.slug)
    obj.created_by = actor.id
    obj.updated_by = actor.id
    db.add(obj)
    db.flush()
    for ch in payload.chapters:
        chapter = SutraChapter(sutra_id=obj.id, **ch.model_dump())
        chapter.created_by = actor.id
        chapter.updated_by = actor.id
        db.add(chapter)
    db.flush()
    db.refresh(obj)
    write_audit(db, action="create", module="sutras", entity_id=obj.id, actor=actor, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.export"))):
    rows = db.query(Sutra).filter(Sutra.is_deleted.is_(False)).order_by(Sutra.created_at.desc()).all()
    buf = StringIO()
    buf.write("id,title,slug,status,translator,source,created_at\n")
    for r in rows:
        vals = [r.id, r.title, r.slug, r.status, r.translator or "", r.source or "", r.created_at.isoformat()]
        escaped = [str(v).replace('"', '""') for v in vals]
        buf.write(",".join(f'"{v}"' for v in escaped) + "\n")
    return Response(content=buf.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=sutras.csv"})


@router.get("/{sutra_id}", response_model=SutraOut)
def get_sutra(
    sutra_id: int,
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("sutras.view")),
) -> SutraOut:
    return get_or_404(db, Sutra, sutra_id, include_deleted=include_deleted)


@router.patch("/{sutra_id}", response_model=SutraOut)
def update_sutra(
    sutra_id: int,
    payload: SutraUpdate,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("sutras.update")),
) -> SutraOut:
    obj = get_or_404(db, Sutra, sutra_id)
    before = safe_snapshot(obj)
    data = payload.model_dump(exclude_unset=True)
    if "slug" in data or "title" in data:
        obj.slug = unique_slug(db, Sutra, data.get("title", obj.title), data.get("slug"), exclude_id=obj.id)
    for k, v in data.items():
        if k == "slug":
            continue
        setattr(obj, k, v)
    obj.updated_by = actor.id
    db.add(obj)
    db.flush()
    write_audit(db, action="update", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{sutra_id}", response_model=Message)
def soft_delete_sutra(
    sutra_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("sutras.delete")),
) -> Message:
    obj = get_or_404(db, Sutra, sutra_id)
    before = safe_snapshot(obj)
    obj.is_deleted = True
    obj.deleted_at = utcnow()
    obj.deleted_by = actor.id
    obj.updated_by = actor.id
    write_audit(db, action="delete", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    return Message(message="Đã xóa mềm bài kinh.")


@router.post("/{sutra_id}/restore", response_model=SutraOut)
def restore_sutra(
    sutra_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission("sutras.restore")),
) -> SutraOut:
    obj = get_or_404(db, Sutra, sutra_id, include_deleted=True)
    before = safe_snapshot(obj)
    obj.is_deleted = False
    obj.deleted_at = None
    obj.deleted_by = None
    obj.updated_by = actor.id
    write_audit(db, action="restore", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{sutra_id}/hard", response_model=Message)
def hard_delete_sutra(
    sutra_id: int,
    request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    obj = get_or_404(db, Sutra, sutra_id, include_deleted=True)
    before = safe_snapshot(obj)
    title = obj.title
    db.delete(obj)
    write_audit(db, action="hard_delete", module="sutras", entity_id=sutra_id, actor=actor, before=before, summary=title, request=request)
    db.commit()
    return Message(message="Đã xóa vật lý bài kinh.")


@router.post("/{sutra_id}/publish", response_model=SutraOut)
def publish_sutra(sutra_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.publish"))) -> SutraOut:
    obj = get_or_404(db, Sutra, sutra_id)
    before = safe_snapshot(obj)
    obj.status = "published"
    obj.published_at = datetime.now(timezone.utc)
    obj.updated_by = actor.id
    write_audit(db, action="publish", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{sutra_id}/hide", response_model=SutraOut)
def hide_sutra(sutra_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.publish"))) -> SutraOut:
    obj = get_or_404(db, Sutra, sutra_id)
    before = safe_snapshot(obj)
    obj.status = "hidden"
    obj.updated_by = actor.id
    write_audit(db, action="hide", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{sutra_id}/chapters", response_model=SutraChapterOut, status_code=201)
def create_chapter(sutra_id: int, payload: SutraChapterCreate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.update"))) -> SutraChapterOut:
    sutra = get_or_404(db, Sutra, sutra_id)
    chapter = SutraChapter(sutra_id=sutra.id, **payload.model_dump(), created_by=actor.id, updated_by=actor.id)
    db.add(chapter)
    db.flush()
    write_audit(db, action="update", module="sutra_chapters", entity_id=chapter.id, actor=actor, after=safe_snapshot(chapter), summary=f"Thêm chương/phẩm cho {sutra.title}", request=request)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.patch("/{sutra_id}/chapters/{chapter_id}", response_model=SutraChapterOut)
def update_chapter(sutra_id: int, chapter_id: int, payload: SutraChapterUpdate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.update"))) -> SutraChapterOut:
    get_or_404(db, Sutra, sutra_id)
    chapter = db.query(SutraChapter).filter(SutraChapter.id == chapter_id, SutraChapter.sutra_id == sutra_id, SutraChapter.is_deleted.is_(False)).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương/phẩm.")
    before = safe_snapshot(chapter)
    # skip_none=False: cho phép gỡ volume_title (null) / clear field
    _set_fields(chapter, payload, skip_none=False)
    chapter.updated_by = actor.id
    write_audit(db, action="update", module="sutra_chapters", entity_id=chapter.id, actor=actor, before=before, after=safe_snapshot(chapter), summary=chapter.title, request=request)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/{sutra_id}/chapters/{chapter_id}", response_model=Message)
def delete_chapter(sutra_id: int, chapter_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.update"))) -> Message:
    get_or_404(db, Sutra, sutra_id)
    chapter = db.query(SutraChapter).filter(SutraChapter.id == chapter_id, SutraChapter.sutra_id == sutra_id, SutraChapter.is_deleted.is_(False)).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Không tìm thấy chương/phẩm.")
    before = safe_snapshot(chapter)
    chapter.is_deleted = True
    chapter.deleted_at = utcnow()
    chapter.deleted_by = actor.id
    write_audit(db, action="delete", module="sutra_chapters", entity_id=chapter.id, actor=actor, before=before, after=safe_snapshot(chapter), summary=chapter.title, request=request)
    db.commit()
    return Message(message="Đã xóa mềm chương/phẩm.")


@router.post("/bulk/delete", response_model=Message)
def bulk_delete(ids: list[int], request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.delete"))) -> Message:
    count = 0
    for obj in db.query(Sutra).filter(Sutra.id.in_(ids), Sutra.is_deleted.is_(False)).all():
        before = safe_snapshot(obj)
        obj.is_deleted = True
        obj.deleted_at = utcnow()
        obj.deleted_by = actor.id
        write_audit(db, action="delete", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
        count += 1
    db.commit()
    return Message(message=f"Đã xóa mềm {count} bài kinh.")


@router.post("/bulk/restore", response_model=Message)
def bulk_restore(ids: list[int], request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("sutras.restore"))) -> Message:
    count = 0
    for obj in db.query(Sutra).filter(Sutra.id.in_(ids), Sutra.is_deleted.is_(True)).all():
        before = safe_snapshot(obj)
        obj.is_deleted = False
        obj.deleted_at = None
        obj.deleted_by = None
        write_audit(db, action="restore", module="sutras", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.title, request=request)
        count += 1
    db.commit()
    return Message(message=f"Đã khôi phục {count} bài kinh.")


@router.get("/{sutra_id}/audit", response_model=Page[AuditLogOut])
def sutra_audit(sutra_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), _: User = Depends(require_permission("sutras.view"))):
    q = db.query(AuditLog).filter(AuditLog.module == "sutras", AuditLog.entity_id == sutra_id).order_by(AuditLog.created_at.desc())
    total = q.count()
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    pages = max(1, (total + page_size - 1) // page_size)
    return Page[AuditLogOut](items=items, total=total, page=page, page_size=page_size, pages=pages)
