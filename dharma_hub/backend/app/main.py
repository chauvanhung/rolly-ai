from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.api.v1.auth import router as auth_router
from app.api.v1.generic_admin import routers as generic_routers
from app.api.v1.sutras import router as sutras_router
from app.api.v1.users import router as users_router
from app.api.v1.registrations import router as registrations_router
from app.api.v1.public import router as public_router
from app.api.v1.user_activity import router as user_activity_router
from app.core.config import settings
from app.core.db import SessionLocal, engine
from app.models import Base


def _cors_origins() -> list[str]:
    raw = (settings.cors_origins or "").strip()
    # Production: never use wildcard with credentials
    if settings.app_env.lower() in {"production", "prod"} and (not raw or raw == "*"):
        return [settings.frontend_base_url.rstrip("/")]
    if raw == "*":
        return ["*"]
    return [x.strip() for x in raw.split(",") if x.strip()]


app = FastAPI(title="phatgiao API", version="0.1.0", docs_url=None if settings.app_env.lower() in {"production", "prod"} else "/docs", redoc_url=None if settings.app_env.lower() in {"production", "prod"} else "/redoc")

_origins = _cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_origins != ["*"],
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if settings.app_env.lower() in {"production", "prod"}:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.on_event("startup")
def on_startup() -> None:
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.services.seed import run_seed
        run_seed(db)
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


app.mount("/api/uploads", StaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(sutras_router, prefix=settings.api_prefix)
app.include_router(users_router, prefix=settings.api_prefix)
app.include_router(registrations_router, prefix=settings.api_prefix)
app.include_router(public_router, prefix=settings.api_prefix)
app.include_router(user_activity_router, prefix=settings.api_prefix)
for r in generic_routers:
    app.include_router(r, prefix=settings.api_prefix)

