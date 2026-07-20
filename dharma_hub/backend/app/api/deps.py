from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_access_token
from app.models import User


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bạn cần đăng nhập.")
    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ.")
    user = db.get(User, int(payload["sub"]))
    if not user or user.is_deleted or not user.is_active or user.is_locked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tài khoản không khả dụng.")
    return user


def require_permission(code: str):
    def dep(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_super_admin:
            return current_user
        if code not in current_user.permission_codes:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thực hiện thao tác này.")
        return current_user
    return dep


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Super Admin được phép thực hiện.")
    return current_user


# In-Memory Rate Limiter to protect public endpoints from spamming/DDoS
import time
from collections import defaultdict
from fastapi import Request

_request_history = defaultdict(list)

def rate_limit_public(request: Request):
    from app.core.config import settings
    limit = settings.public_rate_limit
    window = settings.public_rate_window_seconds
    if limit <= 0:
        return
        
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Filter out timestamps older than the sliding window
    _request_history[client_ip] = [t for t in _request_history[client_ip] if now - t < window]
    
    if len(_request_history[client_ip]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn gửi yêu cầu quá nhanh. Vui lòng chờ 1 phút và thử lại."
        )
        
    _request_history[client_ip].append(now)
