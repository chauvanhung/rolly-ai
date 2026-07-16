from io import StringIO

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.db import get_db
from app.models import Event, EventRegistration, Retreat, RetreatRegistration, User
from app.schemas.common import Message, OrmModel, Page
from app.services.audit import safe_snapshot, write_audit
from app.services.crud import get_or_404

router = APIRouter(tags=["registrations"])


class RegistrationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = None
    note: str | None = None


class RegistrationUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = None
    note: str | None = None
    status: str | None = Field(default=None, pattern="^(pending|approved|rejected)$")


class RegistrationOut(OrmModel):
    id: int
    full_name: str
    email: str | None = None
    phone: str | None = None
    note: str | None = None
    status: str
    confirmation_sent: bool | None = None


def _export(rows, filename: str):
    buf = StringIO()
    buf.write("id,full_name,email,phone,status,note\n")
    for r in rows:
        vals = [r.id, r.full_name, r.email or "", r.phone or "", r.status, r.note or ""]
        escaped = [str(v).replace('"', '""') for v in vals]
        buf.write(",".join(f'"{v}"' for v in escaped) + "\n")
    return Response(content=buf.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/events/{event_id}/registrations", response_model=Page[RegistrationOut])
def list_event_registrations(event_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), _: User = Depends(require_permission("events.view"))):
    get_or_404(db, Event, event_id)
    q = db.query(EventRegistration).filter(EventRegistration.event_id == event_id, EventRegistration.is_deleted.is_(False)).order_by(EventRegistration.created_at.desc())
    total = q.count(); items = q.offset((page - 1) * page_size).limit(page_size).all(); pages = max(1, (total + page_size - 1) // page_size)
    return Page[RegistrationOut](items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("/events/{event_id}/registrations", response_model=RegistrationOut, status_code=201)
def create_event_registration(event_id: int, payload: RegistrationCreate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("events.update"))):
    event = get_or_404(db, Event, event_id)
    obj = EventRegistration(event_id=event.id, **payload.model_dump(), created_by=actor.id, updated_by=actor.id)
    db.add(obj); db.flush()
    write_audit(db, action="create", module="event_registrations", entity_id=obj.id, actor=actor, after=safe_snapshot(obj), summary=f"Đăng ký {event.title}", request=request)
    db.commit(); db.refresh(obj)
    return obj


@router.patch("/events/{event_id}/registrations/{registration_id}", response_model=RegistrationOut)
def update_event_registration(event_id: int, registration_id: int, payload: RegistrationUpdate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("events.update"))):
    get_or_404(db, Event, event_id)
    obj = db.query(EventRegistration).filter(EventRegistration.id == registration_id, EventRegistration.event_id == event_id, EventRegistration.is_deleted.is_(False)).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký.")
    before = safe_snapshot(obj)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_by = actor.id
    write_audit(db, action="update", module="event_registrations", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.full_name, request=request)
    db.commit(); db.refresh(obj)
    return obj


@router.get("/events/{event_id}/registrations/export/csv")
def export_event_registrations(event_id: int, db: Session = Depends(get_db), _: User = Depends(require_permission("events.export"))):
    get_or_404(db, Event, event_id)
    rows = db.query(EventRegistration).filter(EventRegistration.event_id == event_id, EventRegistration.is_deleted.is_(False)).all()
    return _export(rows, "event_registrations.csv")


@router.get("/retreats/{retreat_id}/registrations", response_model=Page[RegistrationOut])
def list_retreat_registrations(retreat_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), _: User = Depends(require_permission("retreats.view"))):
    get_or_404(db, Retreat, retreat_id)
    q = db.query(RetreatRegistration).filter(RetreatRegistration.retreat_id == retreat_id, RetreatRegistration.is_deleted.is_(False)).order_by(RetreatRegistration.created_at.desc())
    total = q.count(); items = q.offset((page - 1) * page_size).limit(page_size).all(); pages = max(1, (total + page_size - 1) // page_size)
    return Page[RegistrationOut](items=items, total=total, page=page, page_size=page_size, pages=pages)


@router.post("/retreats/{retreat_id}/registrations", response_model=RegistrationOut, status_code=201)
def create_retreat_registration(retreat_id: int, payload: RegistrationCreate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("retreats.update"))):
    retreat = get_or_404(db, Retreat, retreat_id)
    obj = RetreatRegistration(retreat_id=retreat.id, **payload.model_dump(), created_by=actor.id, updated_by=actor.id)
    db.add(obj); db.flush()
    write_audit(db, action="create", module="retreat_registrations", entity_id=obj.id, actor=actor, after=safe_snapshot(obj), summary=f"Đăng ký {retreat.title}", request=request)
    db.commit(); db.refresh(obj)
    return obj


@router.patch("/retreats/{retreat_id}/registrations/{registration_id}", response_model=RegistrationOut)
def update_retreat_registration(retreat_id: int, registration_id: int, payload: RegistrationUpdate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("retreats.update"))):
    get_or_404(db, Retreat, retreat_id)
    obj = db.query(RetreatRegistration).filter(RetreatRegistration.id == registration_id, RetreatRegistration.retreat_id == retreat_id, RetreatRegistration.is_deleted.is_(False)).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký.")
    before = safe_snapshot(obj)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    obj.updated_by = actor.id
    write_audit(db, action="update", module="retreat_registrations", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=obj.full_name, request=request)
    db.commit(); db.refresh(obj)
    return obj


@router.post("/retreats/{retreat_id}/registrations/{registration_id}/send-confirmation", response_model=Message)
def mark_retreat_confirmation_sent(retreat_id: int, registration_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("retreats.update"))):
    get_or_404(db, Retreat, retreat_id)
    obj = db.query(RetreatRegistration).filter(RetreatRegistration.id == registration_id, RetreatRegistration.retreat_id == retreat_id, RetreatRegistration.is_deleted.is_(False)).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Không tìm thấy đăng ký.")
    before = safe_snapshot(obj)
    obj.confirmation_sent = True
    write_audit(db, action="update", module="retreat_registrations", entity_id=obj.id, actor=actor, before=before, after=safe_snapshot(obj), summary=f"Đã đánh dấu gửi email xác nhận cho {obj.full_name}", request=request)
    db.commit()
    return Message(message="Đã đánh dấu gửi email xác nhận.")


@router.get("/retreats/{retreat_id}/registrations/export/csv")
def export_retreat_registrations(retreat_id: int, db: Session = Depends(get_db), _: User = Depends(require_permission("retreats.export"))):
    get_or_404(db, Retreat, retreat_id)
    rows = db.query(RetreatRegistration).filter(RetreatRegistration.retreat_id == retreat_id, RetreatRegistration.is_deleted.is_(False)).all()
    return _export(rows, "retreat_registrations.csv")
