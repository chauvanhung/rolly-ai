from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.ai import router as ai_router
from backend.api.auth import router as auth_router
from backend.api.family import router as family_router
from backend.api.planning import router as planning_router
from backend.api.receipt import router as receipt_router
from backend.api.transaction import router as transaction_router
from backend.core.config import settings
from backend.db.base import Base
from backend.db.session import engine


def create_application() -> FastAPI:
    app = FastAPI(
        title="Expense SaaS API",
        version="1.0.0",
        description="Production-ready SaaS API for personal and family expense management.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        max_age=86400,
    )

    app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
    app.include_router(transaction_router, prefix="/api", tags=["transactions"])
    app.include_router(family_router, prefix="/api", tags=["family"])
    app.include_router(planning_router, prefix="/api", tags=["planning"])
    app.include_router(ai_router, prefix="/api", tags=["ai"])
    app.include_router(receipt_router, prefix="/api", tags=["receipt"])

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_application()
