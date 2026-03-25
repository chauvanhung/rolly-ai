from datetime import datetime

from pydantic import BaseModel, Field

from backend.schemas.transaction import TransactionResponse


class AIResponse(BaseModel):
    answer: str
    sql: str | None = None
    rows: list[dict] | None = None


class AILogRequest(BaseModel):
    message: str = Field(min_length=2, max_length=500)
    shared_with_family: bool = False
    tone: str = "gentle"


class ParsedTransactionPreview(BaseModel):
    type: str
    amount: float
    category: str
    note: str
    created_at: datetime
    shared_with_family: bool = False


class AIActionResponse(BaseModel):
    action: str = "transaction"
    answer: str
    parsed: ParsedTransactionPreview | None = None
    transaction: TransactionResponse | None = None
    data: dict | None = None
