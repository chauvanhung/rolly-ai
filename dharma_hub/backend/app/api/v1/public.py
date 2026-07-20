import json
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, and_, desc
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.rate_limit import enforce_rate_limit
from app.models import (
    Sutra,
    SutraChapter,
    DharmaTalk,
    Lecture,
    Teacher,
    Event,
    Retreat,
    RetreatRegistration,
    CharityProgram,
    NewsPost,
    MediaAsset,
    ContactMessage,
    Subscriber,
    Category,
    Tag,
)
from app.schemas.common import Message, Page, OrmModel
from app.services.crud import apply_list_query

router = APIRouter(prefix="/public", tags=["public"])

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
class PublicRetreatRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(min_length=8, max_length=20)
    note: str | None = None

class PublicContactSubmit(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    phone: str | None = None
    subject: str | None = None
    body: str = Field(min_length=10)

class PublicSubscribeSubmit(BaseModel):
    email: EmailStr
    full_name: str | None = None
    phone: str | None = None
    interests: str | None = None  # e.g., "sutras,retreats,charity"

# --- Endpoints ---

@router.get("/sutras")
def list_sutras(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(Sutra).filter(Sutra.is_deleted.is_(False), Sutra.status == "published")
    if category_id:
        q = q.filter(Sutra.category_id == category_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(
            Sutra.title.ilike(term),
            Sutra.summary.ilike(term),
            Sutra.translator.ilike(term),
            Sutra.tags_csv.ilike(term)
        ))
    
    total = q.count()
    items = q.order_by(desc(Sutra.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "items": [serialize_db_obj(x) for x in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size)
    }

@router.get("/sutras/{slug}")
def get_sutra_by_slug(slug: str, db: Session = Depends(get_db)):
    sutra = db.query(Sutra).filter(
        Sutra.slug == slug,
        Sutra.is_deleted.is_(False),
        Sutra.status == "published"
    ).first()
    if not sutra:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài kinh.")
    
    # Load chapters
    chapters = db.query(SutraChapter).filter(
        SutraChapter.sutra_id == sutra.id,
        SutraChapter.is_deleted.is_(False)
    ).order_by(SutraChapter.sort_order).all()
    
    data = serialize_db_obj(sutra)
    data["chapters"] = [serialize_db_obj(ch) for ch in chapters]
    return data

@router.get("/articles")
def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: int | None = None,
    author_id: int | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(DharmaTalk).filter(
        DharmaTalk.is_deleted.is_(False),
        DharmaTalk.status == "published"
    )
    if category_id:
        q = q.filter(DharmaTalk.category_id == category_id)
    if author_id:
        q = q.filter(DharmaTalk.author_id == author_id)
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(
            DharmaTalk.title.ilike(term),
            DharmaTalk.excerpt.ilike(term),
            DharmaTalk.body.ilike(term)
        ))
        
    total = q.count()
    items = q.order_by(desc(DharmaTalk.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    serialized = []
    for talk in items:
        talk_data = serialize_db_obj(talk)
        if talk.author_id:
            author = db.get(Teacher, talk.author_id)
            talk_data["author_name"] = author.name if author else None
        serialized.append(talk_data)
        
    return {
        "items": serialized,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size)
    }

@router.get("/articles/{slug}")
def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    talk = db.query(DharmaTalk).filter(
        DharmaTalk.slug == slug,
        DharmaTalk.is_deleted.is_(False),
        DharmaTalk.status == "published"
    ).first()
    if not talk:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài pháp.")
        
    data = serialize_db_obj(talk)
    if talk.author_id:
        author = db.get(Teacher, talk.author_id)
        data["author"] = serialize_db_obj(author) if author else None
    return data

@router.get("/lectures")
def list_lectures(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    teacher_id: int | None = None,
    category_id: int | None = None,
    kind: str | None = None, # "video" | "audio"
    db: Session = Depends(get_db)
):
    q = db.query(Lecture).filter(
        Lecture.is_deleted.is_(False),
        Lecture.status == "published"
    )
    if teacher_id:
        q = q.filter(Lecture.teacher_id == teacher_id)
    if category_id:
        q = q.filter(Lecture.category_id == category_id)
    if kind == "video":
        q = q.filter(Lecture.video_url.isnot(None))
    elif kind == "audio":
        q = q.filter(Lecture.audio_url.isnot(None))
        
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(
            Lecture.title.ilike(term),
            Lecture.description.ilike(term),
            Lecture.series_name.ilike(term)
        ))
        
    total = q.count()
    items = q.order_by(desc(Lecture.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    serialized = []
    for lec in items:
        lec_data = serialize_db_obj(lec)
        if lec.teacher_id:
            teacher = db.get(Teacher, lec.teacher_id)
            lec_data["teacher_name"] = teacher.name if teacher else None
        serialized.append(lec_data)
        
    return {
        "items": serialized,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size)
    }

@router.get("/lectures/{slug}")
def get_lecture_by_slug(slug: str, db: Session = Depends(get_db)):
    lec = db.query(Lecture).filter(
        Lecture.slug == slug,
        Lecture.is_deleted.is_(False),
        Lecture.status == "published"
    ).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài giảng.")
        
    data = serialize_db_obj(lec)
    if lec.teacher_id:
        teacher = db.get(Teacher, lec.teacher_id)
        data["teacher"] = serialize_db_obj(teacher) if teacher else None
    return data

@router.get("/teachers")
def list_teachers(db: Session = Depends(get_db)):
    teachers = db.query(Teacher).filter(
        Teacher.is_deleted.is_(False),
        Teacher.status == "published"
    ).order_by(Teacher.name).all()
    return [serialize_db_obj(x) for x in teachers]

@router.get("/teachers/{slug}")
def get_teacher_by_slug(slug: str, db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(
        Teacher.slug == slug,
        Teacher.is_deleted.is_(False),
        Teacher.status == "published"
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Không tìm thấy giảng sư.")
        
    data = serialize_db_obj(teacher)
    
    # Get talks and lectures by this teacher
    talks = db.query(DharmaTalk).filter(
        DharmaTalk.author_id == teacher.id,
        DharmaTalk.is_deleted.is_(False),
        DharmaTalk.status == "published"
    ).limit(10).all()
    
    lectures = db.query(Lecture).filter(
        Lecture.teacher_id == teacher.id,
        Lecture.is_deleted.is_(False),
        Lecture.status == "published"
    ).limit(10).all()
    
    data["talks"] = [serialize_db_obj(t) for t in talks]
    data["lectures"] = [serialize_db_obj(l) for l in lectures]
    
    return data

@router.get("/calendar")
def list_events(db: Session = Depends(get_db)):
    events = db.query(Event).filter(
        Event.is_deleted.is_(False),
        Event.status == "published"
    ).order_by(Event.start_at).all()
    return [serialize_db_obj(x) for x in events]

@router.get("/retreats")
def list_retreats(db: Session = Depends(get_db)):
    retreats = db.query(Retreat).filter(
        Retreat.is_deleted.is_(False),
        Retreat.status == "published"
    ).order_by(desc(Retreat.start_at)).all()
    
    serialized = []
    for r in retreats:
        r_data = serialize_db_obj(r)
        # Calculate remaining slots
        reg_count = db.query(RetreatRegistration).filter(
            RetreatRegistration.retreat_id == r.id,
            RetreatRegistration.is_deleted.is_(False),
            RetreatRegistration.status != "rejected"
        ).count()
        r_data["slots_taken"] = reg_count
        r_data["slots_left"] = max(0, (r.capacity or 0) - reg_count) if r.capacity else None
        serialized.append(r_data)
    return serialized

@router.get("/retreats/{slug}")
def get_retreat_by_slug(slug: str, db: Session = Depends(get_db)):
    retreat = db.query(Retreat).filter(
        Retreat.slug == slug,
        Retreat.is_deleted.is_(False),
        Retreat.status == "published"
    ).first()
    if not retreat:
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa tu.")
        
    data = serialize_db_obj(retreat)
    if retreat.teacher_id:
        teacher = db.get(Teacher, retreat.teacher_id)
        data["teacher"] = serialize_db_obj(teacher) if teacher else None
        
    # slots details
    reg_count = db.query(RetreatRegistration).filter(
        RetreatRegistration.retreat_id == retreat.id,
        RetreatRegistration.is_deleted.is_(False),
        RetreatRegistration.status != "rejected"
    ).count()
    data["slots_taken"] = reg_count
    data["slots_left"] = max(0, (retreat.capacity or 0) - reg_count) if retreat.capacity else None
    
    return data

@router.post("/retreats/{retreat_id}/register", response_model=Message)
def register_retreat_public(
    retreat_id: int,
    payload: PublicRetreatRegister,
    request: Request,
    db: Session = Depends(get_db),
):
    enforce_rate_limit(request, scope="public_retreat_register", limit=5, window_seconds=60)
    retreat = db.get(Retreat, retreat_id)
    if not retreat or retreat.is_deleted or retreat.status != "published":
        raise HTTPException(status_code=404, detail="Không tìm thấy khóa tu.")
    
    if not retreat.registration_open:
        raise HTTPException(status_code=400, detail="Cổng đăng ký khóa tu này hiện đã đóng.")
        
    # Check capacity limit
    if retreat.capacity:
        reg_count = db.query(RetreatRegistration).filter(
            RetreatRegistration.retreat_id == retreat.id,
            RetreatRegistration.is_deleted.is_(False),
            RetreatRegistration.status != "rejected"
        ).count()
        if reg_count >= retreat.capacity:
            raise HTTPException(status_code=400, detail="Khóa tu đã đủ số lượng học viên.")

    # Create registration
    reg = RetreatRegistration(
        retreat_id=retreat.id,
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        note=payload.note,
        status="pending"
    )
    db.add(reg)
    db.commit()
    
    # Placeholder for Email confirmation sending trigger
    # In production, this would queue a celery/background email task.
    return Message(message="Đăng ký thành công. Đơn của bạn đang được xét duyệt.")

@router.get("/charities")
def list_charities(db: Session = Depends(get_db)):
    charities = db.query(CharityProgram).filter(
        CharityProgram.is_deleted.is_(False),
        CharityProgram.status == "published"
    ).order_by(desc(CharityProgram.created_at)).all()
    return [serialize_db_obj(x) for x in charities]

@router.get("/media")
def list_media(
    kind: str | None = None, # "image" | "audio" | "video" | "pdf"
    folder: str = "/",
    db: Session = Depends(get_db)
):
    q = db.query(MediaAsset).filter(MediaAsset.is_deleted.is_(False), MediaAsset.folder == folder)
    if kind:
        q = q.filter(MediaAsset.kind == kind)
    assets = q.order_by(desc(MediaAsset.created_at)).all()
    return [serialize_db_obj(x) for x in assets]

@router.post("/contact", response_model=Message)
def submit_contact(payload: PublicContactSubmit, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, scope="public_contact", limit=5, window_seconds=60)
    msg = ContactMessage(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        subject=payload.subject,
        body=payload.body
    )
    db.add(msg)
    db.commit()
    return Message(message="Cảm ơn bạn đã liên hệ. Chúng tôi đã nhận được tin nhắn.")

@router.post("/subscribe", response_model=Message)
def subscribe_newsletter(payload: PublicSubscribeSubmit, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, scope="public_subscribe", limit=5, window_seconds=60)
    # Check if already exists
    sub = db.query(Subscriber).filter(Subscriber.email == payload.email.lower()).first()
    if sub:
        if not sub.is_active:
            sub.is_active = True
            sub.full_name = payload.full_name or sub.full_name
            sub.phone = payload.phone or sub.phone
            sub.interests = payload.interests or sub.interests
            db.commit()
        return Message(message="Email này đã nằm trong danh sách đăng ký nhận tin.")
        
    sub = Subscriber(
        email=payload.email.lower(),
        full_name=payload.full_name,
        phone=payload.phone,
        interests=payload.interests,
        is_active=True
    )
    db.add(sub)
    db.commit()
    return Message(message="Đăng ký nhận thông tin Phật sự thành công.")

@router.get("/news")
def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: int | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(NewsPost).filter(
        NewsPost.is_deleted.is_(False),
        NewsPost.status == "published"
    )
    if category_id:
        q = q.filter(NewsPost.category_id == category_id)
        
    # Pinned first, then date desc
    total = q.count()
    items = q.order_by(desc(NewsPost.is_pinned), desc(NewsPost.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "items": [serialize_db_obj(x) for x in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size)
    }

@router.get("/news/{slug}")
def get_news_by_slug(slug: str, db: Session = Depends(get_db)):
    news = db.query(NewsPost).filter(
        NewsPost.slug == slug,
        NewsPost.is_deleted.is_(False),
        NewsPost.status == "published"
    ).first()
    if not news:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")
    return serialize_db_obj(news)

@router.get("/categories")
def list_categories(module: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Category).filter(Category.is_deleted.is_(False))
    if module:
        q = q.filter(Category.module == module)
    categories = q.order_by(Category.sort_order).all()
    return [serialize_db_obj(x) for x in categories]

# --- Global Search (Vietnamese Diacritics Friendly) ---
@router.get("/search")
def global_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    term = f"%{q.strip()}%"
    
    # 1. Sutras
    sutras = db.query(Sutra).filter(
        Sutra.is_deleted.is_(False),
        Sutra.status == "published",
        or_(Sutra.title.ilike(term), Sutra.summary.ilike(term))
    ).limit(5).all()
    
    # 2. Articles
    talks = db.query(DharmaTalk).filter(
        DharmaTalk.is_deleted.is_(False),
        DharmaTalk.status == "published",
        or_(DharmaTalk.title.ilike(term), DharmaTalk.excerpt.ilike(term))
    ).limit(5).all()
    
    # 3. Lectures
    lectures = db.query(Lecture).filter(
        Lecture.is_deleted.is_(False),
        Lecture.status == "published",
        or_(Lecture.title.ilike(term), Lecture.description.ilike(term))
    ).limit(5).all()
    
    # 4. News
    news = db.query(NewsPost).filter(
        NewsPost.is_deleted.is_(False),
        NewsPost.status == "published",
        or_(NewsPost.title.ilike(term), NewsPost.excerpt.ilike(term))
    ).limit(5).all()

    # 5. Retreats
    retreats = db.query(Retreat).filter(
        Retreat.is_deleted.is_(False),
        Retreat.status == "published",
        or_(Retreat.title.ilike(term), Retreat.description.ilike(term))
    ).limit(5).all()

    return {
        "sutras": [serialize_db_obj(x) for x in sutras],
        "articles": [serialize_db_obj(x) for x in talks],
        "lectures": [serialize_db_obj(x) for x in lectures],
        "news": [serialize_db_obj(x) for x in news],
        "retreats": [serialize_db_obj(x) for x in retreats],
    }
