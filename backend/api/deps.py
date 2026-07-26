import hashlib
import hmac
import secrets

from fastapi import Cookie, Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.core.rate_limit import enforce_rate_limit
from backend.core.security import extract_session_version, extract_subject
from backend.db.session import get_db
from backend.models.user import User
from backend.repositories.user_repository import UserRepository

security_scheme = HTTPBearer(auto_error=False)
ADMIN_ROLES = {"admin", "owner"}
OWNER_ROLES = {"owner"}
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def rate_limit_dependency(request: Request) -> None:
    enforce_rate_limit(request)


def _resolve_token(
    credentials: HTTPAuthorizationCredentials | None,
    session_token: str | None,
) -> str | None:
    if session_token:
        return session_token
    if settings.allow_legacy_bearer_auth and credentials and credentials.credentials:
        return credentials.credentials
    return None


def _verify_csrf_for_session_request(
    *,
    request: Request,
    using_bearer_token: bool,
    csrf_cookie: str | None,
    csrf_header: str | None,
) -> None:
    if using_bearer_token or request.method.upper() in SAFE_METHODS:
        return
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(csrf_cookie, csrf_header):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yêu cầu CSRF token hợp lệ.")


def _keys_equal(provided: str, expected: str) -> bool:
    provided_digest = hashlib.sha256(provided.encode("utf-8")).digest()
    expected_digest = hashlib.sha256(expected.encode("utf-8")).digest()
    return hmac.compare_digest(provided_digest, expected_digest)


def _user_from_bite_log_service_key(db: Session, service_key: str) -> User | None:
    expected = (settings.bite_log_service_api_key or "").strip()
    if not expected or not service_key:
        return None
    if not _keys_equal(service_key.strip(), expected):
        return None

    user_id = settings.bite_log_service_user_id
    if not user_id:
        return None

    user = UserRepository(db).get_by_id(int(user_id))
    if not user or not user.is_active:
        return None
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session_token: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
    csrf_cookie: str | None = Cookie(default=None, alias=settings.csrf_cookie_name),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> User:
    token = _resolve_token(credentials, session_token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu phiên đăng nhập.")

    # CSRF is only skippable when the request is ACTUALLY authenticated via a bearer token
    # (which is not sent automatically cross-site). When a session cookie is present we are
    # cookie-authenticated regardless of any Authorization header, so CSRF must be enforced —
    # otherwise attaching a junk "Authorization" header would disable the double-submit check.
    using_bearer_token = (
        not session_token
        and settings.allow_legacy_bearer_auth
        and bool(credentials and credentials.credentials)
    )
    _verify_csrf_for_session_request(
        request=request,
        using_bearer_token=using_bearer_token,
        csrf_cookie=csrf_cookie,
        csrf_header=csrf_header,
    )

    subject = extract_subject(token)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ.")

    try:
        user_id = int(subject)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ.") from exc

    user = UserRepository(db).get_by_id(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Người dùng không hợp lệ.")

    session_version = extract_session_version(token)
    if session_version is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ.")
    if session_version != int(getattr(user, "session_version", 0)):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập đã hết hiệu lực.")

    return user


def get_current_user_or_service(
    request: Request,
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
    session_token: str | None = Cookie(default=None, alias=settings.auth_cookie_name),
    csrf_cookie: str | None = Cookie(default=None, alias=settings.csrf_cookie_name),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
    x_service_key: str | None = Header(default=None, alias="X-Service-Key"),
) -> User:
    """Session cookie user, or Bite Log service key for server-to-server transaction sync."""
    if x_service_key:
        service_user = _user_from_bite_log_service_key(db, x_service_key)
        if service_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Service key không hợp lệ.")
        return service_user

    return get_current_user(
        request=request,
        db=db,
        credentials=credentials,
        session_token=session_token,
        csrf_cookie=csrf_cookie,
        csrf_header=csrf_header,
    )


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập trang quản trị.")
    return current_user


def get_owner_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in OWNER_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thực hiện thao tác quản trị cao.")
    return current_user
