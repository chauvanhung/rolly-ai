import io

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import RedirectResponse
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.core.config import settings
from backend.core.rate_limit import enforce_rate_limit
from backend.core.security import build_auth_cookie_kwargs, build_csrf_cookie_kwargs
from backend.db.session import get_db
from backend.models.user import User
from backend.schemas.auth import (
    ForgotPasswordRequest,
    GoogleAuthConnectResponse,
    GoogleClientConfigResponse,
    GoogleCredentialLoginRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from backend.services.auth_service import AuthService

router = APIRouter()


def auth_register_rate_limit(request: Request) -> None:
    enforce_rate_limit(
        request,
        scope="auth-register",
        limit=settings.auth_register_rate_limit_requests,
        window_seconds=settings.auth_register_rate_limit_window_seconds,
    )


def auth_login_rate_limit(request: Request) -> None:
    enforce_rate_limit(
        request,
        scope="auth-login",
        limit=settings.auth_login_rate_limit_requests,
        window_seconds=settings.auth_login_rate_limit_window_seconds,
    )


def auth_google_rate_limit(request: Request) -> None:
    enforce_rate_limit(
        request,
        scope="auth-google",
        limit=settings.auth_google_rate_limit_requests,
        window_seconds=settings.auth_google_rate_limit_window_seconds,
    )


def auth_forgot_password_rate_limit(request: Request) -> None:
    enforce_rate_limit(
        request,
        scope="auth-forgot-password",
        limit=settings.auth_forgot_password_rate_limit_requests,
        window_seconds=settings.auth_forgot_password_rate_limit_window_seconds,
    )


def auth_reset_password_rate_limit(request: Request) -> None:
    enforce_rate_limit(
        request,
        scope="auth-reset-password",
        limit=settings.auth_reset_password_rate_limit_requests,
        window_seconds=settings.auth_reset_password_rate_limit_window_seconds,
    )


@router.post("/register", response_model=TokenResponse)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(auth_register_rate_limit),
):
    return AuthService(db).register(payload, request=request, response=response)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(auth_login_rate_limit),
):
    return AuthService(db).login(payload, request=request, response=response)


@router.post("/google", response_model=TokenResponse)
async def login_google_credential(
    payload: GoogleCredentialLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(auth_google_rate_limit),
):
    return await AuthService(db).login_with_google_credential(
        credential=payload.credential,
        request=request,
        response=response,
    )


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(auth_forgot_password_rate_limit),
):
    return AuthService(db).request_password_reset(payload)


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(auth_reset_password_rate_limit),
):
    return AuthService(db).reset_password(payload)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    return AuthService(db).logout(request, response)


@router.get("/me", response_model=UserResponse)
def get_me(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    csrf_cookie: str | None = Cookie(default=None, alias=settings.csrf_cookie_name),
):
    service = AuthService(db)
    service.ensure_csrf_cookie(request, response, csrf_cookie=csrf_cookie)
    return service.serialize_user(current_user)


_ALLOWED_PROFILE_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}

# Map validated content-type -> safe stored extension. Used so the stored file extension NEVER
# comes from the attacker-controlled filename (which could be .html/.svg and execute script when
# served from /api/uploads). content_type is already restricted to _ALLOWED_PROFILE_IMAGE_TYPES.
_EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
}

_IMAGE_MAX_DIMENSIONS = {"background": 1920, "logo": 512, "avatar": 512}
_IMAGE_JPEG_QUALITY = 82


def _compress_profile_image(data: bytes, kind: str) -> tuple[bytes, str]:
    """Downscale + re-encode uploaded images to cap stored size.

    Returns (bytes, forced_extension). forced_extension is "" when the
    original bytes are kept (e.g. HEIC without a decoder installed)."""
    max_dim = _IMAGE_MAX_DIMENSIONS.get(kind, 512)
    try:
        with Image.open(io.BytesIO(data)) as img:
            img = ImageOps.exif_transpose(img)
            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )
            img.thumbnail((max_dim, max_dim), Image.LANCZOS)
            buffer = io.BytesIO()
            if has_alpha:
                img.convert("RGBA").save(buffer, format="PNG", optimize=True)
                return buffer.getvalue(), ".png"
            img.convert("RGB").save(
                buffer, format="JPEG", quality=_IMAGE_JPEG_QUALITY, optimize=True
            )
            return buffer.getvalue(), ".jpg"
    except Exception:
        return data, ""


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name.strip() or current_user.full_name
    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url.strip() or None
    if payload.background_url is not None:
        current_user.background_url = payload.background_url.strip() or None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return AuthService(db).serialize_user(current_user)


@router.post("/me/upload")
async def upload_profile_image(
    file: UploadFile = File(...),
    kind: str = Query("avatar"),
    current_user: User = Depends(get_current_user),
):
    del current_user
    if file.content_type not in _ALLOWED_PROFILE_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Chá»‰ cháº¥p nháº­n áº£nh JPG, PNG, WEBP hoáº·c HEIC.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Táº­p tin trá»‘ng.")

    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"áº¢nh quÃ¡ lá»›n. Tá»‘i Ä‘a {settings.max_upload_size_mb} MB.")

    data, forced_ext = _compress_profile_image(data, kind)

    folder = {"background": "backgrounds", "logo": "branding"}.get(kind, "avatars")
    extension = forced_ext or _EXT_BY_MIME.get(file.content_type, ".jpg")
    safe_name = f"{uuid4().hex}{extension}"
    relative_path = Path(folder) / safe_name
    destination = Path(settings.upload_dir) / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)

    return {"url": f"/api/uploads/{relative_path.as_posix()}"}


@router.get("/google/connect", response_model=GoogleAuthConnectResponse)
def google_connect(
    request: Request,
    return_url: str | None = Query(default=None),
    db: Session = Depends(get_db),
    _: None = Depends(auth_google_rate_limit),
):
    auth_url = AuthService(db).get_google_authorization_url(return_url=return_url, request=request)
    return GoogleAuthConnectResponse(auth_url=auth_url)


@router.get("/google/client-config", response_model=GoogleClientConfigResponse)
def google_client_config() -> GoogleClientConfigResponse:
    client_id = (settings.google_client_id or "").strip() or None
    return GoogleClientConfigResponse(enabled=bool(client_id), client_id=client_id)


@router.get("/google/callback", include_in_schema=False, name="google_auth_callback")
async def google_callback(
    request: Request,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _: None = Depends(auth_google_rate_limit),
):
    redirect_url, access_token, csrf_token = await AuthService(db).handle_google_callback(code=code, state=state, request=request)
    response = RedirectResponse(url=redirect_url, status_code=302)
    response.set_cookie(value=access_token, **build_auth_cookie_kwargs(request))
    response.set_cookie(value=csrf_token, **build_csrf_cookie_kwargs(request))
    return response
