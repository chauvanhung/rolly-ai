from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

app = FastAPI(title="phatgiao API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_origins == "*" else [x.strip() for x in settings.cors_origins.split(",") if x.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

