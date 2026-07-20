import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlparse, urljoin

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models import User
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_SCOPE = "openid email profile"
GOOGLE_STATE_PURPOSE = "phatgiao-google-auth"


class GoogleLoginRequest(BaseModel):
    credential: str = Field(min_length=20)


class GoogleConnectResponse(BaseModel):
    auth_url: str
    enabled: bool = True


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)
    phone: str | None = Field(default=None, max_length=20)


def serialize_user(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        avatar_url=user.avatar_url,
        bio=user.bio,
        is_active=user.is_active,
        is_locked=user.is_locked,
        is_super_admin=user.is_super_admin,
        is_deleted=getattr(user, "is_deleted", False),
        created_at=user.created_at,
        updated_at=user.updated_at,
        role_names=[r.name for r in user.roles if not r.is_deleted],
        permissions=sorted(user.permission_codes),
    )


def _google_configured_redirect() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret)


def _resolve_redirect_uri(request: Request) -> str:
    if settings.google_auth_redirect_uri:
        return settings.google_auth_redirect_uri.strip()
    # Fallback: public URL via reverse proxy host
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "phatgiao.rollyhub.com"
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    if host.startswith("localhost") or host.startswith("127.0.0.1"):
        proto = "http"
    return f"{proto}://{host}{settings.api_prefix}/auth/google/callback"


def _sanitize_return_url(return_url: str | None) -> str:
    base = (settings.frontend_base_url or "https://phatgiao.rollyhub.com").rstrip("/")
    default = f"{base}/account"
    if not return_url:
        return default
    raw = return_url.strip()
    if raw.startswith("/"):
        return urljoin(base + "/", raw.lstrip("/"))
    parsed = urlparse(raw)
    allowed = {urlparse(base).netloc.lower(), "phatgiao.rollyhub.com", "127.0.0.1:3015", "localhost:3015"}
    if parsed.scheme in {"http", "https"} and parsed.netloc.lower() in allowed:
        return raw
    return default


def _issue_session_for_google_profile(
    db: Session,
    request: Request,
    *,
    email: str,
    full_name: str,
    avatar_url: str | None,
    summary: str,
) -> str:
    user = db.query(User).filter(User.email == email, User.is_deleted.is_(False)).first()
    if user:
        user.full_name = (full_name or user.full_name or email).strip()
        if avatar_url:
            user.avatar_url = avatar_url
    else:
        user = User(
            email=email,
            full_name=(full_name or email).strip(),
            avatar_url=avatar_url,
            hashed_password=hash_password(secrets.token_urlsafe(48)),
            is_active=True,
            is_locked=False,
            is_super_admin=False,
        )
        db.add(user)
        db.flush()
        write_audit(
            db,
            action="create",
            module="auth",
            entity_id=user.id,
            actor=user,
            summary="Tạo tài khoản từ Google",
            request=request,
        )

    if not user.is_active or user.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đang bị khóa hoặc chưa kích hoạt.")

    token = create_access_token(str(user.id), {"email": user.email})
    write_audit(db, action="login_google", module="auth", entity_id=user.id, actor=user, summary=summary, request=request)
    db.commit()
    return token


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    from app.core.rate_limit import enforce_rate_limit

    enforce_rate_limit(request, scope="auth_login", limit=20, window_seconds=60)
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or user.is_deleted or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng.")
    if not user.is_active or user.is_locked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đang bị khóa hoặc chưa kích hoạt.")
    token = create_access_token(str(user.id), {"email": user.email})
    write_audit(db, action="login", module="auth", entity_id=user.id, actor=user, summary="Đăng nhập", request=request)
    db.commit()
    return TokenResponse(access_token=token)


@router.get("/google/connect", response_model=GoogleConnectResponse)
def google_connect(
    request: Request,
    return_url: str | None = Query(default=None),
) -> GoogleConnectResponse:
    """OAuth redirect flow giống app.rollyhub.com — không cần Authorized JavaScript origins."""
    if not _google_configured_redirect():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
        )

    redirect_uri = _resolve_redirect_uri(request)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    state = jwt.encode(
        {
            "purpose": GOOGLE_STATE_PURPOSE,
            "return_url": _sanitize_return_url(return_url),
            "exp": int(expires_at.timestamp()),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    query = urlencode(
        {
            "client_id": settings.google_client_id.strip(),
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": GOOGLE_AUTH_SCOPE,
            "access_type": "online",
            "include_granted_scopes": "true",
            "prompt": "select_account",
            "state": state,
        }
    )
    return GoogleConnectResponse(auth_url=f"{GOOGLE_AUTH_URL}?{query}", enabled=True)


@router.get("/google/callback", name="google_auth_callback")
def google_callback(
    request: Request,
    db: Session = Depends(get_db),
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
):
    """Nhận code từ Google, tạo JWT, redirect về frontend (giống app)."""
    if not _google_configured_redirect():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth chưa cấu hình.")

    try:
        state_payload = jwt.decode(state, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google state không hợp lệ.") from exc

    if state_payload.get("purpose") != GOOGLE_STATE_PURPOSE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google state không hợp lệ.")

    return_url = _sanitize_return_url(state_payload.get("return_url"))
    redirect_uri = _resolve_redirect_uri(request)

    try:
        token_res = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.google_client_id.strip(),
                "client_secret": settings.google_client_secret.strip(),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=20,
        )
        token_res.raise_for_status()
        token_payload = token_res.json()
    except requests.HTTPError as exc:
        detail = exc.response.text if exc.response is not None else "Google token exchange failed."
        print(f"[auth/google/callback] exchange failed: {detail}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đổi mã Google thất bại. Kiểm tra Authorized redirect URIs trùng GOOGLE_AUTH_REDIRECT_URI.",
        ) from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không kết nối được tới Google.") from exc

    access = token_payload.get("access_token")
    if not access:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google không trả access_token.")

    try:
        profile_res = requests.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access}"},
            timeout=20,
        )
        profile_res.raise_for_status()
        profile = profile_res.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Không lấy được hồ sơ Google.") from exc

    email = str(profile.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google không trả về email.")
    if profile.get("verified_email") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email Google chưa được xác minh.")

    app_token = _issue_session_for_google_profile(
        db,
        request,
        email=email,
        full_name=str(profile.get("name") or email).strip(),
        avatar_url=profile.get("picture"),
        summary="Đăng nhập Google (OAuth redirect)",
    )

    # Đưa token về frontend qua query; FE lưu localStorage rồi xóa khỏi URL
    sep = "&" if urlparse(return_url).query else "?"
    dest = f"{return_url}{sep}access_token={app_token}&google=1"
    return RedirectResponse(url=dest, status_code=302)


@router.post("/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    """GIS One Tap / button credential (kiểu eat) — cần Authorized JavaScript origins."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Đăng nhập Google chưa được cấu hình.",
        )

    client_id = settings.google_client_id.strip()
    try:
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            audience=client_id,
            clock_skew_in_seconds=60,
        )
    except ValueError as exc:
        reason = str(exc) or "unknown"
        print(f"[auth/google] token verify failed: {reason}", flush=True)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Google token không hợp lệ ({reason}).")
    except Exception as exc:  # noqa: BLE001
        print(f"[auth/google] unexpected verify error: {exc!r}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không xác minh được Google token. Thử đăng nhập redirect (nút Tiếp tục với Google).",
        )

    if info.get("email_verified") is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email Google chưa được xác minh.")

    email = str(info.get("email", "")).lower().strip()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Không lấy được email từ Google.")

    token = _issue_session_for_google_profile(
        db,
        request,
        email=email,
        full_name=str(info.get("name") or email).strip(),
        avatar_url=info.get("picture"),
        summary="Đăng nhập Google (GIS credential)",
    )
    return TokenResponse(access_token=token)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, request: Request, db: Session = Depends(get_db)) -> UserOut:
    email = payload.email.lower().strip()
    existing = db.query(User).filter(User.email == email, User.is_deleted.is_(False)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email đã được đăng ký.")

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=(payload.phone or None),
        hashed_password=hash_password(payload.password),
        is_active=True,
        is_locked=False,
        is_super_admin=False,
    )
    db.add(user)
    db.flush()
    write_audit(
        db,
        action="create",
        module="auth",
        entity_id=user.id,
        actor=user,
        summary="Đăng ký tài khoản Phật tử",
        request=request,
    )
    db.commit()
    db.refresh(user)
    return serialize_user(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return serialize_user(current_user)
