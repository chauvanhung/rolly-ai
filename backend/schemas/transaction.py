from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


class TransactionBase(BaseModel):
    type: str = Field(pattern="^(income|expense)$")
    amount: Decimal = Field(gt=0)
    category: str = Field(min_length=2, max_length=100)
    note: str | None = Field(default=None, max_length=500)
    created_at: datetime | None = None
    shared_with_family: bool = False

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip()


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    type: str | None = Field(default=None, pattern="^(income|expense)$")
    amount: Decimal | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    note: str | None = Field(default=None, max_length=500)
    created_at: datetime | None = None
    shared_with_family: bool | None = None

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str | None) -> str | None:
        return value.strip() if value else value


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    family_id: int | None
    type: str
    amount: Decimal
    category: str
    note: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class SummaryResponse(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    by_category: list[dict[str, Decimal | str]]
    monthly_trends: list[dict[str, Decimal | str]]
