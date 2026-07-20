"""Import major Nikaya collections (HT. Thích Minh Châu) from BuddhaSasana.

Creates/updates one Sutra record per HTML page (usually one sutta or one section).

Collections:
- Trường Bộ (Digha Nikaya)
- Trung Bộ (Majjhima Nikaya)
- Tăng Chi Bộ (Anguttara Nikaya) — multi-phẩm pages
- Tương Ưng Bộ (Samyutta Nikaya) — multi-section pages

Usage (backend container):
  python /app/scripts/import_nikaya_collections.py --dry-run
  python /app/scripts/import_nikaya_collections.py --only truong,trung
  python /app/scripts/import_nikaya_collections.py
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
import urllib3
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.db import SessionLocal  # noqa: E402
from app.models import Sutra, SutraChapter  # noqa: E402
from app.models.base import utcnow  # noqa: E402

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DharmaHubNikayaImporter/1.0; educational use)",
}

COLLECTIONS = {
    "truong": {
        "name": "Kinh Trường Bộ",
        "group": "Kinh tạng Nikāya · Trường Bộ",
        "translator": "Hòa thượng Thích Minh Châu",
        "index": "https://budsas.net/uni/u-kinh-truongbo/truong00.htm",
        "include": r"truong\d+\.htm$",
        "slug_prefix": "truong-bo",
    },
    "trung": {
        "name": "Kinh Trung Bộ",
        "group": "Kinh tạng Nikāya · Trung Bộ",
        "translator": "Hòa thượng Thích Minh Châu",
        "index": "https://budsas.net/uni/u-kinh-trungbo/trung00.htm",
        "include": r"trung\d+\.htm$",
        "slug_prefix": "trung-bo",
    },
    "tangchi": {
        "name": "Kinh Tăng Chi Bộ",
        "group": "Kinh tạng Nikāya · Tăng Chi Bộ",
        "translator": "Hòa thượng Thích Minh Châu",
        "index": "https://budsas.net/uni/u-kinh-tangchibo/tangchi00.htm",
        "include": r"tangchi\d+-\d+\.htm$",
        "slug_prefix": "tang-chi",
    },
    "tuongung": {
        "name": "Kinh Tương Ưng Bộ",
        "group": "Kinh tạng Nikāya · Tương Ưng Bộ",
        "translator": "Hòa thượng Thích Minh Châu",
        "index": "https://budsas.net/uni/u-kinh-tuongungbo/tu-00.htm",
        "include": r"tu\d+-\d+[a-z]?\.htm$",
        "slug_prefix": "tuong-ung",
    },
}

# Note: index pages named *00.htm are always skipped in discover_pages().


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", "-", text.strip())
    text = re.sub(r"-+", "-", text)
    return text[:80].strip("-") or "kinh"


def fetch(url: str) -> str:
    r = requests.get(url, headers=HEADERS, timeout=45, verify=False)
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def natural_key(s: str):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def discover_pages(index_url: str, include_pat: str) -> list[str]:
    html = fetch(index_url)
    soup = BeautifulSoup(html, "lxml")
    rx = re.compile(include_pat, re.I)
    pages = []
    seen = set()
    for a in soup.find_all("a", href=True):
        # strip fragments (#Tap-1) so index anchors don't pollute
        href = urljoin(index_url, a["href"].split("#")[0])
        path = urlparse(href).path
        fname = Path(path).name.lower()
        # skip collection indexes like truong00.htm / trung00.htm
        if re.search(r"00\.htm$", fname):
            continue
        if rx.search(path) and href not in seen:
            pages.append(href)
            seen.add(href)
    pages.sort(key=natural_key)
    return pages


def clean_nikaya_text(text: str, url: str) -> str:
    lines = [ln.strip() for ln in text.replace("\r", "\n").split("\n")]
    out = []
    junk = [
        r"^BuddhaSasana$",
        r"^Home Page$",
        r"^This document is",
        r"^written in Vietnamese",
        r"^Unicode",
        r"^Times$",
        r"^font$",
        r"^Trở về",
        r"^Về trang",
        r"^Mục lục$",
        r"^Phẩm trước$",
        r"^Phẩm sau$",
        r"^Main Page$",
    ]
    jrx = [re.compile(p, re.I) for p in junk]
    for ln in lines:
        if not ln:
            if out and out[-1] != "":
                out.append("")
            continue
        if any(r.search(ln) for r in jrx):
            continue
        out.append(ln)
    body = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()
    body += f"\n\n---\nNguồn: {url}\nXuất xứ: BuddhaSasana/BudSas · HT. Thích Minh Châu dịch."
    return body


def _looks_ascii_mangled(text: str) -> bool:
    """True if title looks like old ASCII transliteration (Tæng, Truong Bo...)."""
    if not text:
        return True
    # Vietnamese diacritics present → good
    if re.search(r"[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]", text, re.I):
        return False
    # Common mangled forms without diacritics
    return bool(re.search(r"Tæng|Tuong Ung|Truong Bo|Trung Bo|Chuong|Pham\s", text, re.I))


def extract_title_and_body(html: str, url: str, fallback_num: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "noscript", "form"]):
        tag.decompose()

    page_title = soup.title.get_text(" ", strip=True) if soup.title else ""
    body_text = soup.body.get_text("\n", strip=True) if soup.body else soup.get_text("\n", strip=True)
    top_lines = [ln.strip().replace("\r", "") for ln in body_text.split("\n")[:50] if ln.strip()]

    # Prefer lines like "1. Kinh Phạm võng" near the top of body
    title = None
    for ln in top_lines:
        m = re.match(r"^(\d{1,3})\.\s*(Kinh\s+.+)$", ln, re.I)
        if m:
            title = f"{m.group(1)}. {m.group(2).strip()}"
            break
        m2 = re.match(r"^(Kinh\s+.{3,80})$", ln, re.I)
        if m2 and not re.search(r"Trường Bộ|Trung Bộ|Tăng Chi|Tương Ưng", ln, re.I):
            title = m2.group(1).strip()
            break

    # Tăng Chi / Tương Ưng multi-section pages: build title from body headings
    if not title:
        coll = next((ln for ln in top_lines if re.search(r"Tăng Chi Bộ|Tương Ưng|Anguttara|Samyutta", ln, re.I)), None)
        chuong = next((ln for ln in top_lines if re.match(r"^Chương\s+", ln, re.I)), None)
        pham = next((ln for ln in top_lines if re.match(r"^(I{1,3}|IV|V|VI{0,3}|IX|X{0,3}|\d+)\.\s*Phẩm\b", ln, re.I) or re.match(r"^Phẩm\s+", ln, re.I)), None)
        parts = []
        if coll:
            # "Tăng Chi Bộ - Anguttara" / "Tương Ưng Bộ - Samyutta Nikaya"
            parts.append(re.split(r"\s*-\s*", coll)[0].strip())
        if chuong:
            parts.append(chuong)
        if pham:
            parts.append(pham)
        if parts:
            title = " · ".join(parts)

    if not title or _looks_ascii_mangled(title):
        # Prefer body-derived over mangled <title>
        m = re.search(r"(\d{1,3})\.\s*(.+)$", page_title)
        candidate = f"{m.group(1)}. {m.group(2).strip()}" if m else page_title
        if candidate and not _looks_ascii_mangled(candidate):
            title = candidate
        elif not title:
            title = candidate or f"Kinh {fallback_num}"

    # Normalize whitespace in title
    title = re.sub(r"\s+", " ", title).strip()
    if len(title) > 280:
        title = title[:280].rstrip()

    body = clean_nikaya_text(body_text, url)
    return title, body


def estimate_minutes(body: str) -> int:
    core = re.sub(r"\n*-{2,}\s*\n\s*Nguồn:[\s\S]*$", "", body or "")
    return max(1, min(999, len(core) // 900))


def make_slug(prefix: str, url: str, title: str, used: set[str]) -> str:
    base_file = Path(urlparse(url).path).stem  # e.g. trung01
    num = re.search(r"(\d+)", base_file)
    num_part = num.group(1).zfill(3) if num else "000"
    tslug = slugify(re.sub(r"^\d+\.\s*", "", title))
    candidate = f"{prefix}-{num_part}-{tslug}"[:100].strip("-")
    if candidate in used:
        candidate = f"{prefix}-{num_part}-{base_file}"
    i = 2
    root = candidate
    while candidate in used:
        candidate = f"{root}-{i}"
        i += 1
    used.add(candidate)
    return candidate


def upsert_sutra(
    db: Session,
    *,
    slug: str,
    title: str,
    body: str,
    group: str,
    translator: str,
    source_url: str,
    dry_run: bool,
) -> dict:
    existing = db.query(Sutra).filter(Sutra.slug == slug).first()
    if dry_run:
        return {
            "slug": slug,
            "title": title,
            "status": "dry_run_create" if not existing else "dry_run_update",
            "body_len": len(body),
            "url": source_url,
        }

    if not existing:
        existing = Sutra(
            title=title,
            slug=slug,
            sutra_group=group,
            translator=translator,
            source=f"BuddhaSasana/BudSas: {source_url}",
            summary=f"Toàn văn {title} — {group}, HT. Thích Minh Châu dịch.",
            body=body,
            reading_minutes=estimate_minutes(body),
            status="published",
            published_at=utcnow(),
            is_deleted=False,
        )
        db.add(existing)
        db.flush()
        db.add(SutraChapter(sutra_id=existing.id, title="Toàn văn", body=body, sort_order=1))
        action = "created"
    else:
        existing.title = title
        existing.sutra_group = group
        existing.translator = translator
        existing.source = f"BuddhaSasana/BudSas: {source_url}"
        existing.summary = f"Toàn văn {title} — {group}, HT. Thích Minh Châu dịch."
        existing.body = body
        existing.reading_minutes = estimate_minutes(body)
        existing.status = "published"
        existing.is_deleted = False
        existing.published_at = existing.published_at or utcnow()
        # replace chapters
        for c in existing.chapters:
            c.is_deleted = True
        db.add(SutraChapter(sutra_id=existing.id, title="Toàn văn", body=body, sort_order=1))
        action = "updated"

    db.commit()
    return {"slug": slug, "title": title, "status": action, "body_len": len(body), "url": source_url}


def import_collection(db: Session, key: str, conf: dict, dry_run: bool, limit: int | None) -> list[dict]:
    print(f"\n=== {conf['name']} ===", flush=True)
    pages = discover_pages(conf["index"], conf["include"])
    if limit:
        pages = pages[:limit]
    print(f"pages={len(pages)}", flush=True)
    results = []
    used_slugs: set[str] = set(
        s.slug for s in db.query(Sutra.slug).all()
    )
    for idx, url in enumerate(pages, start=1):
        try:
            html = fetch(url)
            file_stem = Path(urlparse(url).path).stem
            title, body = extract_title_and_body(html, url, file_stem)
            if len(body) < 800:
                res = {"slug": None, "title": title, "status": "skipped_too_short", "body_len": len(body), "url": url}
            else:
                # Prefer stable slug from filename for uniqueness.
                # Multi-part stems (tangchi12-3, tu01-2a) keep full stem to avoid collisions.
                tslug = slugify(re.sub(r"^\d+\.\s*", "", title))[:50]
                if re.search(r"\d+-\d+", file_stem):
                    num_part = re.sub(r"[^0-9a-z]+", "-", file_stem.lower()).strip("-")
                else:
                    num = re.search(r"(\d+)", file_stem)
                    num_part = num.group(1).zfill(3) if num else f"{idx:03d}"
                slug = f"{conf['slug_prefix']}-{num_part}-{tslug}".strip("-")[:120]
                if slug in used_slugs and not db.query(Sutra).filter(Sutra.slug == slug).first():
                    slug = f"{conf['slug_prefix']}-{file_stem}"[:120]
                # if exists with same slug from previous run, reuse
                if slug not in used_slugs:
                    used_slugs.add(slug)
                res = upsert_sutra(
                    db,
                    slug=slug,
                    title=title if title.lower().startswith("kinh") or re.match(r"^\d+\.", title) else f"Kinh {title}",
                    body=body,
                    group=conf["group"],
                    translator=conf["translator"],
                    source_url=url,
                    dry_run=dry_run,
                )
            print(json.dumps(res, ensure_ascii=False), flush=True)
            results.append(res)
        except Exception as e:
            res = {"url": url, "status": "error", "error": repr(e)}
            print(json.dumps(res, ensure_ascii=False), flush=True)
            results.append(res)
        time.sleep(0.25)
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", type=str, default="truong,trung,tangchi,tuongung", help="Comma list: truong,trung,tangchi,tuongung")
    ap.add_argument("--limit", type=int, default=0, help="Limit pages per collection (0=all)")
    args = ap.parse_args()

    keys = [k.strip() for k in args.only.split(",") if k.strip()]
    limit = args.limit or None

    db = SessionLocal()
    all_results = []
    try:
        for key in keys:
            if key not in COLLECTIONS:
                print(f"Unknown collection: {key}")
                continue
            all_results.extend(import_collection(db, key, COLLECTIONS[key], args.dry_run, limit))

        art = ROOT.parent / ".artifacts" / "dharma_import"
        art.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        path = art / f"nikaya-import-{stamp}.json"
        created = sum(1 for r in all_results if r.get("status") in {"created", "dry_run_create"})
        updated = sum(1 for r in all_results if r.get("status") in {"updated", "dry_run_update"})
        errors = sum(1 for r in all_results if r.get("status") == "error")
        summary = {
            "created": created,
            "updated": updated,
            "errors": errors,
            "total": len(all_results),
            "collections": keys,
        }
        path.write_text(json.dumps({"summary": summary, "items": all_results}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(summary, ensure_ascii=False))
        print(f"REPORT={path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
