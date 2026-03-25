from datetime import datetime

from pydantic import BaseModel


class ReceiptAnalysisResponse(BaseModel):
    merchant: str | None = None
    amount: float | None = None
    transaction_type: str = "expense"
    category: str | None = None
    note: str | None = None
    created_at: datetime | None = None
    detected_text: str | None = None
    confidence_note: str
