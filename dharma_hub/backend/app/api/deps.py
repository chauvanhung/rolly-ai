import secrets

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, decode_access_token
from app.models import User

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    # Prefer the HttpOnly session cookie; fall back to a Bearer header (API clients / migration).
    # CSRF double-submit is enforced only for cookie-authenticated unsafe requests.
    cookie_token = request.cookies.get(AUTH_COOKIE_NAME)
    token = cookie_token
    if not token:
        authorization = request.headers.get("authorization")
        if authorization and authorization.lower().startswith("bearer "):
            token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bạn cần đăng nhập.")

    if cookie_token and request.method.upper() not in _SAFE_METHODS:
        csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME)
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token không hợp lệ.")

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
