from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.api.v1.auth import serialize_user
from app.core.db import get_db
from app.core.security import hash_password
from app.models import AuditLog, Role, User
from app.schemas.auth import ResetPasswordRequest, UserCreate, UserOut, UserUpdate
from app.schemas.common import AuditLogOut, Message, Page
from app.services.audit import safe_snapshot, write_audit
from app.services.crud import apply_list_query, get_or_404, utcnow

router = APIRouter(prefix="/users", tags=["users"])

# Fields that grant privileges / change account standing. Holding "users.update" is NOT enough
# to set these — only a super admin may, otherwise any account with the permission (e.g. the
# Editor role) could promote itself to super admin or grant itself roles.
_PRIVILEGED_USER_FIELDS = {"is_super_admin", "is_active", "is_locked"}


def _forbid_managing_super_admin(actor: User, target: User) -> None:
    if target.is_super_admin and not actor.is_super_admin:
        raise HTTPException(status_code=403, detail="Không thể thao tác trên tài khoản Super Admin.")


def _forbid_privilege_escalation(actor: User, target: User, data: dict, role_ids) -> None:
    if actor.is_super_admin:
        return
    if bool(_PRIVILEGED_USER_FIELDS & set(data.keys())) or role_ids is not None:
        raise HTTPException(status_code=403, detail="Chỉ Super Admin mới được đổi quyền, trạng thái hoặc vai trò người dùng.")
    _forbid_managing_super_admin(actor, target)


@router.get("", response_model=Page[UserOut])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    include_deleted: bool = False,
    only_deleted: bool = False,
    sort: str = "-created_at",
    db: Session = Depends(get_db),
    _: User = Depends(require_permission("users.view")),
):
    items, total, page, page_size, pages = apply_list_query(
        db, User, page=page, page_size=page_size, search=search, sort=sort,
        include_deleted=include_deleted, only_deleted=only_deleted,
        search_fields=["email", "full_name", "phone"],
    )
    return Page[UserOut](items=[serialize_user(x) for x in items], total=total, page=page, page_size=page_size, pages=pages)


@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.create"))):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")
    user = User(email=payload.email.lower(), full_name=payload.full_name, phone=payload.phone, hashed_password=hash_password(payload.password), created_by=actor.id, updated_by=actor.id)
    if payload.role_ids:
        user.roles = db.query(Role).filter(Role.id.in_(payload.role_ids), Role.is_deleted.is_(False)).all()
    db.add(user)
    db.flush()
    write_audit(db, action="create", module="users", entity_id=user.id, actor=actor, after=safe_snapshot(user), summary=user.email, request=request)
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, include_deleted: bool = False, db: Session = Depends(get_db), _: User = Depends(require_permission("users.view"))):
    return serialize_user(get_or_404(db, User, user_id, include_deleted=include_deleted))


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.update"))):
    user = get_or_404(db, User, user_id)
    before = safe_snapshot(user)
    data = payload.model_dump(exclude_unset=True)
    role_ids = data.pop("role_ids", None)
    _forbid_privilege_escalation(actor, user, data, role_ids)
    for k, v in data.items():
        setattr(user, k, v)
    if role_ids is not None:
        user.roles = db.query(Role).filter(Role.id.in_(role_ids), Role.is_deleted.is_(False)).all() if role_ids else []
    user.updated_by = actor.id
    write_audit(db, action="update", module="users", entity_id=user.id, actor=actor, before=before, after=safe_snapshot(user), summary=user.email, request=request)
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.post("/{user_id}/reset-password", response_model=Message)
def reset_password(user_id: int, payload: ResetPasswordRequest, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.update"))):
    user = get_or_404(db, User, user_id)
    _forbid_managing_super_admin(actor, user)
    user.hashed_password = hash_password(payload.password)
    user.updated_by = actor.id
    write_audit(db, action="update", module="users", entity_id=user.id, actor=actor, summary=f"Đặt lại mật khẩu {user.email}", request=request)
    db.commit()
    return Message(message="Đã đặt lại mật khẩu.")


@router.post("/{user_id}/lock", response_model=UserOut)
def lock_user(user_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.update"))):
    user = get_or_404(db, User, user_id)
    _forbid_managing_super_admin(actor, user)
    before = safe_snapshot(user)
    user.is_locked = True
    write_audit(db, action="update", module="users", entity_id=user.id, actor=actor, before=before, after=safe_snapshot(user), summary=f"Khóa {user.email}", request=request)
    db.commit(); db.refresh(user)
    return serialize_user(user)


@router.post("/{user_id}/unlock", response_model=UserOut)
def unlock_user(user_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.update"))):
    user = get_or_404(db, User, user_id)
    _forbid_managing_super_admin(actor, user)
    before = safe_snapshot(user)
    user.is_locked = False
    write_audit(db, action="update", module="users", entity_id=user.id, actor=actor, before=before, after=safe_snapshot(user), summary=f"Mở khóa {user.email}", request=request)
    db.commit(); db.refresh(user)
    return serialize_user(user)


@router.delete("/{user_id}", response_model=Message)
def delete_user(user_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.delete"))):
    user = get_or_404(db, User, user_id)
    _forbid_managing_super_admin(actor, user)
    before = safe_snapshot(user)
    user.is_deleted = True
    user.deleted_at = utcnow()
    user.deleted_by = actor.id
    write_audit(db, action="delete", module="users", entity_id=user.id, actor=actor, before=before, after=safe_snapshot(user), summary=user.email, request=request)
    db.commit()
    return Message(message="Đã xóa mềm người dùng.")


@router.post("/{user_id}/restore", response_model=UserOut)
def restore_user(user_id: int, request: Request, db: Session = Depends(get_db), actor: User = Depends(require_permission("users.restore"))):
    user = get_or_404(db, User, user_id, include_deleted=True)
    before = safe_snapshot(user)
    user.is_deleted = False; user.deleted_at = None; user.deleted_by = None
    write_audit(db, action="restore", module="users", entity_id=user.id, actor=actor, before=before, after=safe_snapshot(user), summary=user.email, request=request)
    db.commit(); db.refresh(user)
    return serialize_user(user)


@router.get("/{user_id}/audit", response_model=Page[AuditLogOut])
def user_audit(user_id: int, page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), _: User = Depends(require_permission("users.view"))):
    q = db.query(AuditLog).filter(AuditLog.module == "users", AuditLog.entity_id == user_id).order_by(AuditLog.created_at.desc())
    total = q.count(); items = q.offset((page - 1) * page_size).limit(page_size).all(); pages = max(1, (total + page_size - 1) // page_size)
    return Page[AuditLogOut](items=items, total=total, page=page, page_size=page_size, pages=pages)
