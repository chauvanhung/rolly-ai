from datetime import datetime

from pydantic import BaseModel, Field


class FamilyCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class FamilyResponse(BaseModel):
    id: int
    name: str
    invite_code: str
    created_at: datetime

    class Config:
        from_attributes = True
