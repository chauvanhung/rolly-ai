from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import Permission, Role, User

MODULES = [
    "sutras", "dharma_talks", "lectures", "teachers", "events", "retreats",
    "charity_programs", "news_posts", "media_assets", "users", "roles", "categories", "tags",
    "contact_messages", "subscribers",
]
ACTIONS = ["view", "create", "update", "delete", "restore", "approve", "publish", "export"]


def ensure_permissions_and_roles(db: Session) -> None:
    changed = False
    for module in MODULES:
        for action in ACTIONS:
            code = f"{module}.{action}"
            if not db.query(Permission).filter(Permission.code == code).first():
                db.add(Permission(code=code, module=module, action=action, description=f"{action} {module}"))
                changed = True
    db.flush()

    super_role = db.query(Role).filter(Role.slug == "super-admin").first()
    if not super_role:
        super_role = Role(name="Super Admin", slug="super-admin", description="Toàn quyền hệ thống", is_system=True)
        db.add(super_role)
        changed = True
    admin_role = db.query(Role).filter(Role.slug == "admin").first()
    if not admin_role:
        admin_role = Role(name="Admin", slug="admin", description="Quản trị nội dung", is_system=True)
        db.add(admin_role)
        changed = True
    editor_role = db.query(Role).filter(Role.slug == "editor").first()
    if not editor_role:
        editor_role = Role(name="Editor", slug="editor", description="Biên tập nội dung", is_system=True)
        db.add(editor_role)
        changed = True
    viewer_role = db.query(Role).filter(Role.slug == "viewer").first()
    if not viewer_role:
        viewer_role = Role(name="Viewer", slug="viewer", description="Chỉ xem", is_system=True)
        db.add(viewer_role)
        changed = True
    db.flush()

    all_perms = db.query(Permission).all()
    if len(super_role.permissions) != len(all_perms):
        super_role.permissions = all_perms
        changed = True
    if not admin_role.permissions:
        admin_role.permissions = all_perms
        changed = True
    if not editor_role.permissions:
        editor_role.permissions = [p for p in all_perms if p.action in {"view", "create", "update", "approve", "publish", "export"}]
        changed = True
    if not viewer_role.permissions:
        viewer_role.permissions = [p for p in all_perms if p.action in {"view", "export"}]
        changed = True

    if changed:
        db.commit()


def ensure_demo_super_admin(db: Session) -> None:
    # Chỉ tạo tài khoản mẫu khi chưa có user nào. Đổi mật khẩu ngay sau khi triển khai thật.
    if db.query(User).count() > 0:
        return
    ensure_permissions_and_roles(db)
    role = db.query(Role).filter(Role.slug == "super-admin").first()
    user = User(
        email="admin@phatgiao.rollyhub.com",
        full_name="Quản trị viên",
        hashed_password=hash_password("ChangeMe123!"),
        is_super_admin=True,
        is_active=True,
    )
    if role:
        user.roles.append(role)
    db.add(user)
    db.commit()

