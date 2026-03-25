from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.core.rate_limit import enforce_rate_limit
from backend.core.security import extract_subject
from backend.db.session import get_db
from backend.models.user import User
from backend.repositories.user_repository import UserRepository

security_scheme = HTTPBearer(auto_error=False)


def rate_limit_dependency(request: Request) -> None:
    enforce_rate_limit(request)


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu access token.")
    subject = extract_subject(credentials.credentials)
    if not subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token không hợp lệ.")
    user = UserRepository(db).get_by_id(int(subject))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Người dùng không hợp lệ.")
    return user
