from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.api.deps import get_current_user
from app.core.db import get_db
from app.models import (
    User,
    Bookmark,
    ReadingProgress,
    ListeningProgress,
    RetreatRegistration,
    Retreat,
    Sutra,
    DharmaTalk,
    Lecture
)
from app.schemas.common import Message

router = APIRouter(prefix="/user", tags=["user_activity"])

# --- Helper to serialize model objects to dictionaries ---
def serialize_db_obj(obj) -> dict[str, Any]:
    if not obj:
        return {}
    res = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        res[col.name] = val
    return res

# --- Pydantic Inputs ---
class BookmarkCreate(BaseModel):
    item_type: str = Field(pattern="^(sutra|dharma_talk|lecture)$")
    item_id: int

class ReadingProgressUpdate(BaseModel):
    sutra_id: int
    last_chapter_id: int | None = None
    last_scroll_pos: int = 0
    percent_complete: int = Field(ge=0, le=100)

class ListeningProgressUpdate(BaseModel):
    lecture_id: int
    last_seconds: int = 0
    percent_complete: int = Field(ge=0, le=100)

# --- Endpoints ---

@router.get("/bookmarks")
def list_bookmarks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookmarks = db.query(Bookmark).filter(Bookmark.user_id == current_user.id).order_by(Bookmark.created_at.desc()).all()
    
    serialized = []
    for b in bookmarks:
        item_data = {}
        if b.item_type == "sutra":
            item = db.get(Sutra, b.item_id)
            if item and not item.is_deleted:
                item_data = {"title": item.title, "slug": item.slug, "cover_url": item.cover_url}
        elif b.item_type == "dharma_talk":
            item = db.get(DharmaTalk, b.item_id)
            if item and not item.is_deleted:
                item_data = {"title": item.title, "slug": item.slug, "cover_url": item.cover_url}
        elif b.item_type == "lecture":
            item = db.get(Lecture, b.item_id)
            if item and not item.is_deleted:
                item_data = {"title": item.title, "slug": item.slug, "cover_url": item.cover_url or item.video_url}
                
        b_data = serialize_db_obj(b)
        b_data["item_details"] = item_data
        serialized.append(b_data)
        
    return serialized

@router.post("/bookmarks", response_model=Message)
def add_bookmark(
    payload: BookmarkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if exists
    exists = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.item_type == payload.item_type,
        Bookmark.item_id == payload.item_id
    ).first()
    if exists:
        return Message(message="Nội dung này đã được lưu từ trước.")
        
    # Check if target exists
    if payload.item_type == "sutra":
        target = db.get(Sutra, payload.item_id)
    elif payload.item_type == "dharma_talk":
        target = db.get(DharmaTalk, payload.item_id)
    elif payload.item_type == "lecture":
        target = db.get(Lecture, payload.item_id)
    else:
        target = None
        
    if not target or getattr(target, "is_deleted", False):
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung cần lưu.")
        
    bookmark = Bookmark(
        user_id=current_user.id,
        item_type=payload.item_type,
        item_id=payload.item_id
    )
    db.add(bookmark)
    db.commit()
    return Message(message="Đã lưu nội dung thành công.")

@router.delete("/bookmarks/{item_type}/{item_id}", response_model=Message)
def remove_bookmark(
    item_type: str,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bookmark = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.item_type == item_type,
        Bookmark.item_id == item_id
    ).first()
    if not bookmark:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung đã lưu.")
        
    db.delete(bookmark)
    db.commit()
    return Message(message="Đã bỏ lưu nội dung.")

@router.get("/progress/reading")
def get_reading_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ReadingProgress).filter(ReadingProgress.user_id == current_user.id).all()
    return [serialize_db_obj(p) for p in progress]

@router.post("/progress/reading", response_model=Message)
def update_reading_progress(
    payload: ReadingProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id,
        ReadingProgress.sutra_id == payload.sutra_id
    ).first()
    
    if not progress:
        progress = ReadingProgress(
            user_id=current_user.id,
            sutra_id=payload.sutra_id
        )
        db.add(progress)
        
    progress.last_chapter_id = payload.last_chapter_id
    progress.last_scroll_pos = payload.last_scroll_pos
    progress.percent_complete = payload.percent_complete
    progress.updated_at = datetime.utcnow()
    
    db.commit()
    return Message(message="Đã cập nhật tiến độ đọc.")

@router.get("/progress/listening")
def get_listening_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ListeningProgress).filter(ListeningProgress.user_id == current_user.id).all()
    return [serialize_db_obj(p) for p in progress]

@router.post("/progress/listening", response_model=Message)
def update_listening_progress(
    payload: ListeningProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ListeningProgress).filter(
        ListeningProgress.user_id == current_user.id,
        ListeningProgress.lecture_id == payload.lecture_id
    ).first()
    
    if not progress:
        progress = ListeningProgress(
            user_id=current_user.id,
            lecture_id=payload.lecture_id
        )
        db.add(progress)
        
    progress.last_seconds = payload.last_seconds
    progress.percent_complete = payload.percent_complete
    progress.updated_at = datetime.utcnow()
    
    db.commit()
    return Message(message="Đã cập nhật tiến độ nghe.")

@router.get("/retreats")
def list_my_retreats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Match registrations by email or phone
    conditions = []
    if current_user.email:
        conditions.append(RetreatRegistration.email == current_user.email.lower())
    if current_user.phone:
        conditions.append(RetreatRegistration.phone == current_user.phone)
        
    if not conditions:
        return []
        
    registrations = db.query(RetreatRegistration).filter(
        and_(
            RetreatRegistration.is_deleted.is_(False),
            or_(*conditions)
        )
    ).order_by(RetreatRegistration.created_at.desc()).all()
    
    serialized = []
    for reg in registrations:
        retreat = db.get(Retreat, reg.retreat_id)
        retreat_data = serialize_db_obj(retreat) if retreat else {}
        
        reg_data = serialize_db_obj(reg)
        reg_data["retreat_details"] = retreat_data
        serialized.append(reg_data)
        
    return serialized
