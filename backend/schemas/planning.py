from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class BudgetCreate(BaseModel):
    category: str = Field(min_length=2, max_length=100)
    monthly_limit: Decimal = Field(gt=0)
    shared_with_family: bool = False


class BudgetUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=2, max_length=100)
    monthly_limit: Decimal | None = Field(default=None, gt=0)
    shared_with_family: bool | None = None


class BudgetResponse(BaseModel):
    id: int
    user_id: int
    family_id: int | None
    category: str
    monthly_limit: Decimal
    spent_amount: Decimal = Decimal("0")
    remaining_amount: Decimal = Decimal("0")
    usage_percent: float = 0
    created_at: datetime

    class Config:
        from_attributes = True


class SavingsGoalCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    target_amount: Decimal = Field(gt=0)
    current_amount: Decimal = Field(default=0, ge=0)
    target_date: date | None = None
    is_active: bool = True


class SavingsGoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=120)
    target_amount: Decimal | None = Field(default=None, gt=0)
    current_amount: Decimal | None = Field(default=None, ge=0)
    target_date: date | None = None
    is_active: bool | None = None


class SavingsGoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    target_amount: Decimal
    current_amount: Decimal
    target_date: date | None
    is_active: bool
    progress_percent: float = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderCreate(BaseModel):
    title: str = Field(min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=100)
    amount: Decimal | None = Field(default=None, gt=0)
    due_date: date
    recurrence: str = Field(default="monthly", pattern="^(once|weekly|monthly|yearly)$")
    note: str | None = Field(default=None, max_length=500)


class ReminderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    category: str | None = Field(default=None, max_length=100)
    amount: Decimal | None = Field(default=None, gt=0)
    due_date: date | None = None
    recurrence: str | None = Field(default=None, pattern="^(once|weekly|monthly|yearly)$")
    note: str | None = Field(default=None, max_length=500)
    is_completed: bool | None = None


class ReminderResponse(BaseModel):
    id: int
    user_id: int
    title: str
    category: str | None
    amount: Decimal | None
    due_date: date
    recurrence: str
    note: str | None
    is_completed: bool
    status: str = "upcoming"
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryRuleCreate(BaseModel):
    keyword: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=100)
    transaction_type: str | None = Field(default=None, pattern="^(income|expense)$")
    note_template: str | None = Field(default=None, max_length=300)
    is_active: bool = True


class CategoryRuleUpdate(BaseModel):
    keyword: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    transaction_type: str | None = Field(default=None, pattern="^(income|expense)$")
    note_template: str | None = Field(default=None, max_length=300)
    is_active: bool | None = None


class CategoryRuleResponse(BaseModel):
    id: int
    user_id: int
    keyword: str
    category: str
    transaction_type: str | None
    note_template: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UtilityBillCreate(BaseModel):
    provider: str = Field(min_length=2, max_length=120)
    customer_code: str = Field(min_length=2, max_length=120)
    category: str = Field(default="Hóa đơn", min_length=2, max_length=100)
    preferred_payment_method: str = Field(default="MoMo", min_length=2, max_length=40)
    estimated_amount: Decimal | None = Field(default=None, gt=0)
    due_day: int = Field(default=10, ge=1, le=31)
    note: str | None = Field(default=None, max_length=500)
    is_active: bool = True


class UtilityBillUpdate(BaseModel):
    provider: str | None = Field(default=None, min_length=2, max_length=120)
    customer_code: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    preferred_payment_method: str | None = Field(default=None, min_length=2, max_length=40)
    estimated_amount: Decimal | None = Field(default=None, gt=0)
    due_day: int | None = Field(default=None, ge=1, le=31)
    note: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class UtilityBillResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    customer_code: str
    category: str
    preferred_payment_method: str
    estimated_amount: Decimal | None
    due_day: int
    note: str | None
    is_active: bool
    next_due_date: date
    status: str = "upcoming"
    google_calendar_synced: bool = False
    google_calendar_event_link: str | None = None
    google_calendar_last_synced_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class GoogleCalendarStatusResponse(BaseModel):
    connected: bool
    google_email: str | None = None
    calendar_id: str | None = None


class GoogleCalendarConnectResponse(BaseModel):
    auth_url: str


class GoogleCalendarSyncResponse(BaseModel):
    message: str
    event_link: str | None = None
