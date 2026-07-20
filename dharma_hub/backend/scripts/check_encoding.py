"""Quick check of Vietnamese text quality in published sutras."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.db import SessionLocal
from app.models import Sutra

db = SessionLocal()
try:
    samples = [
        "trung-bo-074%",
        "trung-bo-001%",
        "truong-bo-001%",
        "tang-chi%",
        "tuong-ung-tu1-01%",
    ]
    for pat in samples:
        s = db.query(Sutra).filter(Sutra.slug.like(pat)).first()
        if not s:
            print(pat, "NOT FOUND")
            continue
        body = s.body or ""
        print("---", s.slug)
        print("title:", s.title)
        print(
            "has_toi:",
            "Tôi nghe" in body,
            "has_The_Ton:",
            "Thế Tôn" in body,
            "has_mojibake_ThA:",
            "ThA'n" in body,
        )
        # print a clean snippet around first content
        idx = body.find("Tôi")
        if idx < 0:
            idx = body.find("Như vầy")
        if idx < 0:
            idx = 0
        print("sample:", repr(body[idx : idx + 160]))

    all_s = (
        db.query(Sutra)
        .filter(Sutra.is_deleted.is_(False), Sutra.status == "published")
        .all()
    )
    good = bad = other = 0
    bad_slugs = []
    for s in all_s:
        b = s.body or ""
        if "Thế Tôn" in b or "Tôi nghe" in b or "Như vầy tôi nghe" in b:
            good += 1
        elif "ThA'n" in b or "tA'i nghe" in b:
            bad += 1
            bad_slugs.append(s.slug)
        elif any(c in b for c in "ăâêôơưđáàảãạéèếềíìóòốồớờúùứừýỳ"):
            good += 1
        else:
            other += 1
            bad_slugs.append(s.slug)
    print("good_vn", good, "suspect_bad", bad, "other", other, "total", len(all_s))
    if bad_slugs[:10]:
        print("bad_examples:", bad_slugs[:10])
finally:
    db.close()
