import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from starlette.responses import Response

from app.core.config import settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Session token lives in an HttpOnly cookie so JavaScript (e.g. via XSS) cannot read/exfiltrate
# it. A readable CSRF cookie backs a double-submit check because cookies are auto-sent. FE and BE
# are same-origin (phatgiao.rollyhub.com), so SameSite=Lax is sufficient.
AUTH_COOKIE_NAME = "dharma_session"
CSRF_COOKIE_NAME = "dharma_csrf"


def _cookie_secure() -> bool:
    return settings.app_env.lower() in {"production", "prod", "staging"}


def set_auth_cookies(response: Response, token: str) -> str:
    max_age = settings.access_token_expire_minutes * 60
    secure = _cookie_secure()
    response.set_cookie(
        AUTH_COOKIE_NAME, token, max_age=max_age,
        httponly=True, secure=secure, samesite="lax", path="/",
    )
    csrf_token = secrets.token_urlsafe(32)
    response.set_cookie(
        CSRF_COOKIE_NAME, csrf_token, max_age=max_age,
        httponly=False, secure=secure, samesite="lax", path="/",
    )
    return csrf_token


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")


def hash_password(raw: str) -> str:
    return _pwd.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return _pwd.verify(raw, hashed)
    except Exception:
        return False


def create_access_token(subject: str, extra: dict | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception:
        return None
