from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import OrmModel


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(OrmModel):
    id: int
    email: EmailStr
    full_name: str
    phone: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool
    is_locked: bool
    is_super_admin: bool
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    role_names: list[str] = []
    permissions: list[str] = []


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = None
    role_ids: list[int] = []


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    is_active: bool | None = None
    is_locked: bool | None = None
    is_super_admin: bool | None = None
    role_ids: list[int] | None = None


class ResetPasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)
