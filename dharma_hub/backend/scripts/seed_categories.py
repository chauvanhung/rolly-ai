"""Seed full category tree for sutras (bộ kinh) + other modules; backfill sutra.category_id."""
from __future__ import annotations

import sys
from pathlib import Path

# Allow `python scripts/seed_categories.py` from backend root / container
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.db import SessionLocal
from app.models import Category, Sutra
from app.services.crud import make_slug, utcnow

CATS = [
    # Sutras — Nikāya
    {
        "name": "Nikāya · Trường Bộ",
        "slug": "nikaya-truong-bo",
        "module": "sutras",
        "sort_order": 10,
        "description": "Dīgha Nikāya — Kinh tạng Trường Bộ",
        "match": ["trường bộ", "truong bo", "dīgha", "digha"],
    },
    {
        "name": "Nikāya · Trung Bộ",
        "slug": "nikaya-trung-bo",
        "module": "sutras",
        "sort_order": 20,
        "description": "Majjhima Nikāya — Kinh tạng Trung Bộ",
        "match": ["trung bộ", "trung bo", "majjhima"],
    },
    {
        "name": "Nikāya · Tương Ưng Bộ",
        "slug": "nikaya-tuong-ung-bo",
        "module": "sutras",
        "sort_order": 30,
        "description": "Saṃyutta Nikāya — Kinh tạng Tương Ưng",
        "match": ["tương ưng", "tuong ung", "saṃyutta", "samyutta"],
    },
    {
        "name": "Nikāya · Tăng Chi Bộ",
        "slug": "nikaya-tang-chi-bo",
        "module": "sutras",
        "sort_order": 40,
        "description": "Aṅguttara Nikāya — Kinh tạng Tăng Chi",
        "match": ["tăng chi", "tang chi", "aṅguttara", "anguttara"],
    },
    {
        "name": "Nikāya · Tiểu Bộ",
        "slug": "nikaya-tieu-bo",
        "module": "sutras",
        "sort_order": 50,
        "description": "Khuddaka Nikāya — Pháp Cú, Kinh Tập…",
        "match": ["tiểu bộ", "tieu bo", "khuddaka", "pháp cú", "phap cu"],
    },
    {
        "name": "Kinh Nguyên Thủy (chung)",
        "slug": "kinh-nguyen-thuy",
        "module": "sutras",
        "sort_order": 60,
        "description": "Kinh Nguyên thủy chưa gán bộ cụ thể",
        "match": ["nguyên thủy", "nguyen thuy", "nikāya", "nikaya"],
        "match_fallback": True,
    },
    {
        "name": "Kinh Đại Thừa",
        "slug": "kinh-dai-thua",
        "module": "sutras",
        "sort_order": 70,
        "description": "Kinh điển Đại thừa (Pháp Hoa, Hoa Nghiêm, Lăng Nghiêm…)",
        "match": ["đại thừa", "dai thua", "đại thừ"],
    },
    {
        "name": "Kinh Tịnh Độ",
        "slug": "kinh-tinh-do",
        "module": "sutras",
        "sort_order": 80,
        "description": "A Di Đà, Vô Lượng Thọ, Quán Vô Lượng Thọ…",
        "match": ["tịnh độ", "tinh do"],
    },
    {
        "name": "Thiền tông",
        "slug": "kinh-thien-tong",
        "module": "sutras",
        "sort_order": 90,
        "description": "Kinh / ngữ lục Thiền",
        "match": ["thiền tông", "thien tong", "thiền"],
    },
    {
        "name": "Kinh Nhật Tụng",
        "slug": "kinh-nhat-tung",
        "module": "sutras",
        "sort_order": 100,
        "description": "Kinh tụng phổ thông, nhật tụng",
        "match": ["nhật tụng", "nhat tung", "tụng phổ thông", "tung pho thong"],
    },
    {
        "name": "Luật tạng",
        "slug": "luat-tang",
        "module": "sutras",
        "sort_order": 110,
        "description": "Giới luật Tăng Ni",
        "match": ["luật", "luat"],
    },
    {
        "name": "Luận tạng",
        "slug": "luan-tang",
        "module": "sutras",
        "sort_order": 120,
        "description": "A-tỳ-đạt-ma / luận thư",
        "match": ["luận", "luan"],
    },
    # Dharma talks
    {"name": "Phật Pháp Căn Bản", "slug": "phat-phap-can-ban", "module": "dharma_talks", "sort_order": 1},
    {"name": "Phật Pháp Ứng Dụng", "slug": "phat-phap-ung-dung", "module": "dharma_talks", "sort_order": 2},
    {"name": "Hỏi Đáp Phật Pháp", "slug": "hoi-dap-phat-phap", "module": "dharma_talks", "sort_order": 3},
    {"name": "Giảng Kinh", "slug": "giang-kinh", "module": "dharma_talks", "sort_order": 4},
    {"name": "Lịch sử Phật giáo", "slug": "lich-su-phat-giao", "module": "dharma_talks", "sort_order": 5},
    # Lectures
    {"name": "Pháp Thoại Định Kỳ", "slug": "phap-thoai-dinh-ky", "module": "lectures", "sort_order": 1},
    {"name": "Khóa Tu Mùa Hè", "slug": "khoa-tu-mua-he", "module": "lectures", "sort_order": 2},
    {"name": "Giảng Kinh (audio/video)", "slug": "giang-kinh-av", "module": "lectures", "sort_order": 3},
    {"name": "Thiền / Chánh niệm", "slug": "thien-chanh-niem", "module": "lectures", "sort_order": 4},
    {"name": "Tịnh Độ / Niệm Phật", "slug": "tinh-do-niem-phat", "module": "lectures", "sort_order": 5},
    {"name": "Chưa phân loại", "slug": "bai-giang-chua-phan-loai", "module": "lectures", "sort_order": 99},
    # News
    {"name": "Thông Báo", "slug": "thong-bao", "module": "news_posts", "sort_order": 1},
    {"name": "Tin Hoạt Động", "slug": "tin-hoat-dong", "module": "news_posts", "sort_order": 2},
    {"name": "Lịch Phật sự", "slug": "lich-phat-su", "module": "news_posts", "sort_order": 3},
    # Retreats
    {"name": "Khóa tu một ngày", "slug": "khoa-tu-mot-ngay", "module": "retreats", "sort_order": 1},
    {"name": "Khóa tu nhiều ngày", "slug": "khoa-tu-nhieu-ngay", "module": "retreats", "sort_order": 2},
    {"name": "Khóa tu mùa hè", "slug": "khoa-tu-mua-he-retreat", "module": "retreats", "sort_order": 3},
]


def normalize(s: str) -> str:
    import unicodedata

    s = (s or "").lower().strip()
    s = s.replace("đ", "d").replace("Đ", "d")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s


def main() -> None:
    db = SessionLocal()
    try:
        by_slug: dict[str, Category] = {}
        created = 0
        updated = 0
        for row in CATS:
            cat = db.query(Category).filter(Category.slug == row["slug"]).first()
            if not cat:
                cat = Category(
                    name=row["name"],
                    slug=row["slug"],
                    module=row["module"],
                    description=row.get("description"),
                    sort_order=row.get("sort_order", 0),
                )
                db.add(cat)
                created += 1
            else:
                cat.name = row["name"]
                cat.module = row["module"]
                cat.description = row.get("description")
                cat.sort_order = row.get("sort_order", 0)
                cat.is_deleted = False
                updated += 1
            db.flush()
            by_slug[row["slug"]] = cat

        db.commit()

        # Backfill sutras
        sutra_cats = [c for c in CATS if c["module"] == "sutras"]
        # Specific first (no match_fallback), then fallbacks
        primary = [c for c in sutra_cats if not c.get("match_fallback")]
        fallbacks = [c for c in sutra_cats if c.get("match_fallback")]

        mapped = 0
        for sutra in db.query(Sutra).filter(Sutra.is_deleted.is_(False)).all():
            group = sutra.sutra_group or ""
            gnorm = normalize(group)
            chosen = None
            for c in primary:
                for m in c.get("match") or []:
                    if normalize(m) in gnorm:
                        chosen = c
                        break
                if chosen:
                    break
            if not chosen:
                for c in fallbacks:
                    for m in c.get("match") or []:
                        if normalize(m) in gnorm:
                            # avoid matching generic nikaya when specific already would match — already handled
                            chosen = c
                            break
                    if chosen:
                        break
            if chosen:
                cat = by_slug[chosen["slug"]]
                sutra.category_id = cat.id
                sutra.sutra_group = cat.name
                mapped += 1

        db.commit()

        # Stats
        print(f"categories created={created} updated={updated}")
        print(f"sutras mapped={mapped}")
        rows = (
            db.query(Category.name, Category.slug)
            .filter(Category.module == "sutras", Category.is_deleted.is_(False))
            .order_by(Category.sort_order)
            .all()
        )
        print("sutra categories:")
        for name, slug in rows:
            n = db.query(Sutra).filter(Sutra.category_id == by_slug[slug].id, Sutra.is_deleted.is_(False)).count()
            print(f"  {name}: {n}")
        uncat = db.query(Sutra).filter(Sutra.is_deleted.is_(False), Sutra.category_id.is_(None)).count()
        print(f"uncategorized: {uncat}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
