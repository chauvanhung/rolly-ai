from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.core.security import create_access_token, hash_password, verify_password
from backend.repositories.family_repository import FamilyRepository
from backend.repositories.user_repository import UserRepository
from backend.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)
        self.families = FamilyRepository(db)

    def register(self, payload: RegisterRequest) -> TokenResponse:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã tồn tại.")

        family_id = None
        if payload.family_invite_code:
            family = self.families.get_by_invite_code(payload.family_invite_code.strip().upper())
            if not family:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mã gia đình.")
            family_id = family.id
        elif payload.family_name:
            family = self.families.create(payload.family_name.strip())
            family_id = family.id

        user = self.users.create(
            email=payload.email,
            full_name=payload.full_name.strip(),
            password_hash=hash_password(payload.password),
            family_id=family_id,
        )
        self.db.commit()
        self.db.refresh(user)
        token = create_access_token(str(user.id))
        return TokenResponse(access_token=token, user=UserResponse.model_validate(user))

    def login(self, payload: LoginRequest) -> TokenResponse:
        user = self.users.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email hoặc mật khẩu không đúng.")
        token = create_access_token(str(user.id))
        return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
