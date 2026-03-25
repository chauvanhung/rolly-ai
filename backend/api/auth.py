from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.deps import rate_limit_dependency
from backend.db.session import get_db
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from backend.services.auth_service import AuthService

router = APIRouter(dependencies=[Depends(rate_limit_dependency)])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    return AuthService(db).register(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(payload)
