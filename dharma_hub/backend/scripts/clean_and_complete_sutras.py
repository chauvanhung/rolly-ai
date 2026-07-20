"""Light-clean sutra bodies.

- Local/web-imported pages: strip chrome (tags, donation, related links)
- Canon imports (BudSas/SuttaCentral): only normalize whitespace + attribution
- Soft-delete only very short stubs (<1200 chars)

Usage:
  python clean_and_complete_sutras.py --dry-run
  python clean_and_complete_sutras.py
  python clean_and_complete_sutras.py --delete-incomplete
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.db import SessionLocal  # noqa: E402
from app.models import Sutra  # noqa: E402

MIN_KEEP = 1200

LOCALISH = (
    "local file",
    "phatgiao.org",
    "phatphapungdung",
    "bachhac",
    "daotranglienhoa",
    "hethongchuatamnguyen",
    "daivienman.wordpress",
    "phapthihoi.org",
    "quanam.us",
)


def is_localish(source: str | None) -> bool:
    s = (source or "").lower()
    return any(x in s for x in LOCALISH)


def strip_attr(text: str) -> tuple[str, str | None]:
    m = re.search(r"\n*-{2,}\s*\n\s*Nguồn:\s*(.+)\s*$", text, re.S)
    if not m:
        return text, None
    return text[: m.start()].rstrip(), m.group(1).strip()


def light_clean(text: str) -> str:
    body, src = strip_attr(text or "")
    body = body.replace("\r", "\n")
    body = re.sub(r"\n{3,}", "\n\n", body)
    body = body.strip()
    if src:
        body += f"\n\n---\nNguồn: {src}"
    elif text and "Nguồn:" in text[-300:]:
        # keep original trailing attr if complex
        pass
    return body


def web_clean(text: str) -> str:
    body, src = strip_attr(text or "")
    body = re.sub(r"(?is)STK\s*:\s*[\d\s.]+.{0,100}?Ngân hàng.{0,160}", "", body)
    body = re.sub(r"(?im)^>>\s*DỮ LIỆU KINH PHẬT.*$", "", body)

    chrome = [
        r"^\s*Tag\s*$",
        r"^\s*Tags?\s*$",
        r"^\s*\d+\s*Views?\s*$",
        r"^\s*Share\s*$",
        r"^\s*Facebook\s*$",
        r"^\s*Print\s*$",
        r"^\s*Like\s*$",
        r"^\s*Bài viết liên quan\s*$",
        r"^\s*Related posts?\s*$",
        r"^\s*Chia sẻ\s*$",
        r"^\s*Kinh Tạng\s*$",
        r"^\s*Bộ Kinh Tập\s*$",
        r"^\s*Bộ Hoa Nghiêm\s*$",
        r"^\s*Bộ Đại Tập\s*$",
        r"^\s*Kinh Điển Đại Thừa\s*$",
        r"^\s*Thần Chú\s*$",
        r"^\s*Hướng Dẫn Tụng.*$",
        r"^\s*Trung Nguyễn\s*$",
        r"^\s*Tháng\s+\d+.*\d{4}\s*$",
        r"^\s*This email address is being protected.*$",
    ]
    rx = [re.compile(p, re.I) for p in chrome]
    out = []
    for ln in body.replace("\r", "\n").split("\n"):
        s = ln.strip()
        if not s:
            if out and out[-1] != "":
                out.append("")
            continue
        if any(r.search(s) for r in rx):
            continue
        if re.fullmatch(r"(?:\d{1,3}\s+){6,}\d{1,3}", s):
            continue
        out.append(s)
    body = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()

    # Chop leading web chrome before first real start
    if re.search(r"Tag|Views|Kinh Tạng|Kinh Điển", body[:900], re.I):
        markers = [
            r"(?im)^(KINH\s+.+)$",
            r"(?im)^(Như vầy tôi nghe)",
            r"(?im)^(Như thị ngã văn)",
            r"(?im)^(Ta nghe như vầy)",
            r"(?im)^(QUYỂN\s+\d+)",
            r"(?im)^(Phẩm\s+\d+)",
            r"(?im)^(NAM MÔ)",
            r"(?im)^(Nghi thức)",
            r"(?im)^(CHÚ\s+)",
            r"(?im)^(Đại Phật Đảnh)",
        ]
        best = None
        for p in markers:
            m = re.search(p, body)
            if m and m.start() < 1800 and (best is None or m.start() < best):
                best = m.start()
        if best and best > 40:
            body = body[best:].strip()

    body = re.split(r"(?im)\n(?:Bài viết liên quan|Related posts?)\n", body)[0].strip()
    if src:
        body += f"\n\n---\nNguồn: {src}"
    return body


def estimate_minutes(body: str) -> int:
    core = re.sub(r"\n*-{2,}\s*\n\s*Nguồn:[\s\S]*$", "", body or "")
    return max(1, min(999, len(core) // 900))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--delete-incomplete", action="store_true")
    args = ap.parse_args()

    db = SessionLocal()
    try:
        art = ROOT.parent / ".artifacts" / "dharma_import"
        art.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        sutras = (
            db.query(Sutra)
            .filter(Sutra.is_deleted.is_(False), Sutra.status == "published")
            .order_by(Sutra.id)
            .all()
        )
        report = []
        kept = deleted = 0
        for s in sutras:
            old = s.body or ""
            new = web_clean(old) if is_localish(s.source) else light_clean(old)
            core = re.sub(r"\n*-{2,}\s*\n\s*Nguồn:[\s\S]*$", "", new).strip()
            bad = len(core) < MIN_KEEP
            if bad and args.delete_incomplete:
                if not args.dry_run:
                    s.is_deleted = True
                    s.status = "draft"
                    for c in s.chapters:
                        c.is_deleted = True
                action = "soft_deleted_incomplete"
                deleted += 1
            else:
                if not args.dry_run:
                    s.body = new
                    s.reading_minutes = estimate_minutes(new)
                action = "cleaned_web" if is_localish(s.source) else "cleaned_light"
                kept += 1
            row = {
                "slug": s.slug,
                "source": s.source,
                "old_len": len(old),
                "new_len": len(new),
                "delta": len(old) - len(new),
                "incomplete": bad,
                "action": action,
            }
            report.append(row)
            print(json.dumps(row, ensure_ascii=False))

        if not args.dry_run:
            db.commit()
        summary = {"kept": kept, "deleted": deleted, "total": len(sutras), "at": stamp}
        print(json.dumps(summary, ensure_ascii=False))
        path = art / f"sutra-clean-report-{stamp}.json"
        path.write_text(json.dumps({"summary": summary, "items": report}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"REPORT={path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
