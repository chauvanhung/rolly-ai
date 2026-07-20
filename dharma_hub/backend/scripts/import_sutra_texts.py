"""Import full Vietnamese sutra bodies from public Buddhist sources.

Sources:
- BuddhaSasana/BudSas (static HTML)
- SuttaCentral API (Thích Minh Châu translations)
- Rộng Mở Tâm Hồn (best-effort HTML extraction)

Safety:
- backs up current sutras + chapters to .artifacts before modifying
- only updates records whose body is clearly a short stub (< 1000 chars) unless --force
- stores attribution/source URL in Sutra.source
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.db import SessionLocal  # noqa: E402
from app.models import Sutra, SutraChapter  # noqa: E402

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; DharmaHubImporter/1.1; +local educational use)",
    "Accept": "text/html,application/json",
}

# Confirmed Vietnamese sources.
SOURCES: dict[str, dict] = {
    # --- BudSas multi-page / single ---
    "kinh-chuyen-phap-luan": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "budsas_book",
        "url": "https://budsas.net/uni/u-chuyen-phapluan/chpl-00.htm",
        "include_patterns": [r"chpl-1-1\.htm$", r"chpl-1-2\.htm$"],
    },
    "kinh-vo-nga-tuong": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "budsas_book",
        "url": "https://budsas.net/uni/u-kinhvnt/kvnt00.htm",
        "include_patterns": [r"kvnt\d+\.htm$"],
    },
    "kinh-dieu-phap-lien-hoa": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "budsas_book",
        "url": "https://budsas.net/uni/u-kinh-ph/phaphoa00.htm",
        "include_patterns": [r"phaphoa0[1-7]\.htm$"],
    },
    "kinh-kim-cang-bat-nha": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "budsas_book",
        "url": "https://budsas.net/uni/u-kinh-kc/kimcang00.htm",
        "include_patterns": [r"kimcang0[1-5]\.htm$"],
    },
    "bat-nha-tam-kinh": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "single",
        "url": "https://budsas.net/uni/u-kinh-bt-ngan/bntk.htm",
    },
    "kinh-a-di-a": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "single",
        "url": "https://budsas.net/uni/u-kinh-bt-ngan/adida.htm",
    },
    "kinh-vo-luong-tho": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "single",
        "url": "https://budsas.net/uni/u-kinh-bt-ngan/dvlt.htm",
    },
    "kinh-quan-vo-luong-tho": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "single",
        "url": "https://budsas.net/uni/u-kinh-bt-ngan/qvltp.htm",
    },
    "kinh-phap-bao-an": {
        "source_name": "Rộng Mở Tâm Hồn / Đại Tạng Kinh Việt Nam",
        "type": "rmt",
        "url": "https://www.rongmotamhon.net/xem-kinh_kinh-phap-bao-dan-%28don_kgkcmkkq_viet1.html",
    },
    "kinh-vu-lan-bao-hieu": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "single",
        "url": "https://budsas.net/uni/u-kinh-bt-ngan/vulan.htm",
    },
    "kinh-phap-cu": {
        "source_name": "BuddhaSasana/BudSas",
        "type": "budsas_book",
        "url": "https://budsas.net/uni/u-kinh-phapcu-ev/dhp_idx.htm",
        "include_patterns": [r"dhp_ev\d+\.htm$"],
    },
    # --- SuttaCentral: HT. Thích Minh Châu ---
    "kinh-phuoc-duc": {
        "source_name": "SuttaCentral / HT. Thích Minh Châu",
        "type": "suttacentral",
        "uid": "kp5",
        "author_uid": "minh_chau",
        "url": "https://suttacentral.net/kp5/vi/minh_chau",
    },
    "kinh-tu-bi": {
        "source_name": "SuttaCentral / HT. Thích Minh Châu",
        "type": "suttacentral",
        "uid": "kp9",
        "author_uid": "minh_chau",
        "url": "https://suttacentral.net/kp9/vi/minh_chau",
    },
    # NOTE: Many Mahayana full texts (Phổ Môn, Địa Tạng, Lăng Nghiêm, ...) are not
    # available as clean static HTML on BudSas/SuttaCentral. RMT pages are SPA shells
    # and do not expose full body text for reliable scraping. Those remain stubs until
    # provided as local files via --from-dir import mode.
}

# Alias records removed from library to avoid duplicates (kept soft-deleted in DB).
ALIASES: dict[str, str] = {}


def fetch(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=40, verify=False)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or "utf-8"
    if "budsas.net" in url:
        resp.encoding = "utf-8"
    return resp.text


def fetch_json(url: str) -> dict:
    resp = requests.get(url, headers={**HEADERS, "Accept": "application/json"}, timeout=40, verify=False)
    resp.raise_for_status()
    return resp.json()


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "noscript", "form", "header", "footer"]):
        tag.decompose()
    return soup.get_text("\n", strip=True)


def text_from_html(html: str, url: str, typ: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "noscript", "form"]):
        tag.decompose()

    title = soup.title.get_text(" ", strip=True) if soup.title else ""

    if typ == "rmt":
        # Prefer explicit content containers; fall back to largest text block.
        el = (
            soup.select_one("#vietdich")
            or soup.select_one(".readme")
            or soup.select_one(".viet")
            or soup.select_one("article")
            or soup.select_one(".content")
            or soup.select_one("main")
        )
        if el is None:
            # pick largest div/section with substantial text
            best = None
            best_len = 0
            for cand in soup.find_all(["div", "section", "article"]):
                t = cand.get_text("\n", strip=True)
                if len(t) > best_len:
                    best = cand
                    best_len = len(t)
            el = best or soup.body or soup
    else:
        el = soup.body or soup

    text = el.get_text("\n", strip=True) if el else soup.get_text("\n", strip=True)
    text = clean_text(text, url)
    return title, text


def clean_text(text: str, url: str) -> str:
    text = text.replace("\r", "\n")
    lines = [ln.strip() for ln in text.split("\n")]
    out: list[str] = []
    junk_patterns = [
        r"^BuddhaSasana$",
        r"^Home Page$",
        r"^This document is written",
        r"^Unicode",
        r"^Trở\s+về",
        r"^Về trang",
        r"^Font chữ",
        r"^Chọn dữ liệu",
        r"^Tải tất cả",
        r"^Trang chủ",
        r"^Close$",
        r"^×$",
        r"^Image$",
        r"^\*$",
        r"^Chuyển điều hướng$",
        r"^Liên\s+Phật Hội$",
        r"^Facebook$",
        r"^Wordpress$",
        r"^Tìm kiếm",
        r"^United Buddhist",
        r"^Scribd$",
        r"^Smashwords$",
        r"^Amazon$",
    ]
    for ln in lines:
        if not ln:
            if out and out[-1] != "":
                out.append("")
            continue
        if any(re.search(p, ln, re.I) for p in junk_patterns):
            continue
        if len(ln) < 4 and re.fullmatch(r"[\d\W]+", ln):
            continue
        out.append(ln)
    text = "\n".join(out)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    attribution = f"\n\n---\nNguồn: {url}"
    if "rongmotamhon.net" in url:
        attribution += "\nXuất xứ: Rộng Mở Tâm Hồn / Đại Tạng Kinh Việt Nam."
    elif "budsas.net" in url:
        attribution += "\nXuất xứ: BuddhaSasana/BudSas."
    elif "suttacentral.net" in url:
        attribution += "\nXuất xứ: SuttaCentral (bản dịch HT. Thích Minh Châu)."
    return text.strip() + attribution


def discover_book_pages(index_url: str, include_patterns: list[str]) -> list[str]:
    html = fetch(index_url)
    soup = BeautifulSoup(html, "lxml")
    pages: list[str] = []
    seen = set()
    regexes = [re.compile(p, re.I) for p in include_patterns]
    for a in soup.find_all("a", href=True):
        href = urljoin(index_url, a["href"])
        path = urlparse(href).path
        if any(rx.search(path) for rx in regexes) and href not in seen:
            pages.append(href)
            seen.add(href)
    pages.sort(key=natural_key)
    return pages


def natural_key(s: str):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def scrape_suttacentral(conf: dict) -> tuple[str, str, list[dict]]:
    uid = conf["uid"]
    author = conf.get("author_uid", "minh_chau")
    api = f"https://suttacentral.net/api/suttas/{uid}/{author}?lang=vi"
    data = fetch_json(api)
    # Prefer root_text when it already is Vietnamese translation payload.
    payload = data.get("root_text") or data.get("translation") or {}
    title = payload.get("title") or uid
    html = payload.get("text") or ""
    if not html:
        raise RuntimeError(f"Empty SC payload for {uid}/{author}")
    text = clean_text(html_to_text(html), conf.get("url") or api)
    return title, text, [{"title": title[:300], "body": text, "source_url": conf.get("url") or api}]


def scrape_source(conf: dict) -> tuple[str, str, list[dict]]:
    typ = conf["type"]
    if typ == "suttacentral":
        return scrape_suttacentral(conf)

    if typ in {"single", "rmt"}:
        html = fetch(conf["url"])
        title, text = text_from_html(html, conf["url"], typ)
        return title, text, [{"title": title or "Toàn văn", "body": text, "source_url": conf["url"]}]

    if typ == "budsas_book":
        pages = discover_book_pages(conf["url"], conf.get("include_patterns", []))
        if not pages:
            raise RuntimeError(f"No pages discovered from {conf['url']}")
        bodies = []
        chapters = []
        for idx, page in enumerate(pages, start=1):
            html = fetch(page)
            title, text = text_from_html(html, page, "single")
            chapter_title = title.split("|")[0].strip() or f"Phần {idx}"
            chapters.append({"title": chapter_title[:300], "body": text, "source_url": page})
            bodies.append(f"# {chapter_title}\n\n{text}")
            time.sleep(0.3)
        return "", "\n\n".join(bodies), chapters

    raise ValueError(f"Unknown type: {typ}")


def estimate_reading_minutes(body: str) -> int:
    # ~200 Vietnamese words/min rough estimate using characters
    chars = len(body or "")
    return max(1, min(999, chars // 900))


def backup(db: Session, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    path = out_dir / f"sutras-backup-{stamp}.json"
    data = []
    for s in db.query(Sutra).order_by(Sutra.id).all():
        data.append(
            {
                "id": s.id,
                "title": s.title,
                "slug": s.slug,
                "summary": s.summary,
                "body": s.body,
                "source": s.source,
                "status": s.status,
                "chapters": [
                    {"id": c.id, "title": c.title, "body": c.body, "sort_order": c.sort_order}
                    for c in sorted(s.chapters, key=lambda c: c.sort_order)
                ],
            }
        )
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def update_sutra(db: Session, sutra: Sutra, conf: dict, force: bool, dry_run: bool) -> dict:
    current_len = len(sutra.body or "")
    if not force and current_len >= 1000:
        return {"slug": sutra.slug, "status": "skipped_existing_full", "body_len": current_len}

    title, body, chapters = scrape_source(conf)
    if len(body) < 1000:
        return {
            "slug": sutra.slug,
            "status": "skipped_too_short",
            "new_len": len(body),
            "url": conf.get("url") or conf.get("uid"),
        }

    if dry_run:
        return {
            "slug": sutra.slug,
            "status": "dry_run_ok",
            "old_len": current_len,
            "new_len": len(body),
            "chapters": len(chapters),
            "url": conf.get("url") or conf.get("uid"),
        }

    sutra.body = body
    if not sutra.summary or len(sutra.summary) < 120 or "mẫu" in (sutra.summary or "").lower():
        sutra.summary = f"Toàn văn {sutra.title}, nhập từ {conf['source_name']}."
    sutra.source = f"{conf['source_name']}: {conf.get('url') or conf.get('uid')}"
    sutra.status = "published"
    sutra.reading_minutes = estimate_reading_minutes(body)

    if len(chapters) >= 1:
        for c in sutra.chapters:
            c.is_deleted = True
        for idx, ch in enumerate(chapters, start=1):
            db.add(
                SutraChapter(
                    sutra_id=sutra.id,
                    title=ch["title"][:300],
                    body=ch["body"],
                    sort_order=idx,
                )
            )

    return {
        "slug": sutra.slug,
        "status": "updated",
        "old_len": current_len,
        "new_len": len(body),
        "chapters": len(chapters),
        "url": conf.get("url") or conf.get("uid"),
    }


def soft_delete_demo(db: Session, dry_run: bool) -> dict:
    demo = db.query(Sutra).filter(Sutra.slug == "kinh-demo", Sutra.is_deleted.is_(False)).first()
    if not demo:
        return {"slug": "kinh-demo", "status": "not_found"}
    if dry_run:
        return {"slug": "kinh-demo", "status": "dry_run_delete"}
    demo.is_deleted = True
    demo.status = "draft"
    return {"slug": "kinh-demo", "status": "soft_deleted"}


def import_from_dir(db: Session, from_dir: Path, force: bool, dry_run: bool) -> list[dict]:
    """Import local .txt/.md files named by slug: <slug>.txt"""
    results = []
    if not from_dir.exists():
        return [{"status": "from_dir_missing", "path": str(from_dir)}]
    sutras = {s.slug: s for s in db.query(Sutra).filter(Sutra.is_deleted.is_(False)).all()}
    for path in sorted(list(from_dir.glob("*.txt")) + list(from_dir.glob("*.md"))):
        slug = path.stem
        sutra = sutras.get(slug)
        if not sutra:
            results.append({"slug": slug, "status": "missing_in_db", "file": str(path)})
            continue
        body = path.read_text(encoding="utf-8").strip()
        if len(body) < 1000:
            results.append({"slug": slug, "status": "skipped_too_short", "new_len": len(body)})
            continue
        if not force and len(sutra.body or "") >= 1000:
            results.append({"slug": slug, "status": "skipped_existing_full", "body_len": len(sutra.body or "")})
            continue
        if dry_run:
            results.append({"slug": slug, "status": "dry_run_ok", "new_len": len(body), "file": str(path)})
            continue
        sutra.body = body + f"\n\n---\nNguồn: file nội bộ {path.name}"
        sutra.summary = sutra.summary if sutra.summary and "mẫu" not in sutra.summary.lower() else f"Toàn văn {sutra.title}."
        sutra.source = f"Local file: {path.name}"
        sutra.status = "published"
        sutra.reading_minutes = estimate_reading_minutes(body)
        for c in sutra.chapters:
            c.is_deleted = True
        db.add(SutraChapter(sutra_id=sutra.id, title="Toàn văn", body=sutra.body, sort_order=1))
        db.commit()
        results.append({"slug": slug, "status": "updated", "new_len": len(body), "file": str(path)})
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--only", nargs="*", help="Only import these slugs")
    ap.add_argument(
        "--from-dir",
        type=str,
        default="",
        help="Import local .txt/.md named by slug (e.g. kinh-pho-mon.txt)",
    )
    args = ap.parse_args()

    db = SessionLocal()
    try:
        art_dir = ROOT.parent / ".artifacts" / "dharma_import"
        backup_path = backup(db, art_dir)
        results = [{"backup": str(backup_path)}]
        sutras = {s.slug: s for s in db.query(Sutra).filter(Sutra.is_deleted.is_(False)).all()}

        sources = SOURCES
        if args.only:
            sources = {k: v for k, v in SOURCES.items() if k in set(args.only)}

        for slug, conf in sources.items():
            sutra = sutras.get(slug)
            if not sutra:
                results.append({"slug": slug, "status": "missing_in_db"})
                continue
            try:
                res = update_sutra(db, sutra, conf, args.force, args.dry_run)
            except Exception as e:
                res = {"slug": slug, "status": "error", "error": repr(e), "url": conf.get("url")}
            print(json.dumps(res, ensure_ascii=False))
            results.append(res)
            if not args.dry_run:
                db.commit()
            time.sleep(0.4)

        # alias records
        for alias_slug, canonical_slug in ALIASES.items():
            if args.only and alias_slug not in set(args.only) and canonical_slug not in set(args.only or []):
                continue
            # refresh from db after updates
            alias = db.query(Sutra).filter(Sutra.slug == alias_slug, Sutra.is_deleted.is_(False)).first()
            canonical = db.query(Sutra).filter(Sutra.slug == canonical_slug, Sutra.is_deleted.is_(False)).first()
            if not alias or not canonical or not canonical.body or len(canonical.body) < 1000:
                results.append({"slug": alias_slug, "status": "alias_source_unavailable"})
                continue
            if not args.force and len(alias.body or "") >= 1000:
                results.append({"slug": alias_slug, "status": "skipped_existing_full"})
                continue
            if not args.dry_run:
                alias.body = canonical.body
                alias.summary = alias.summary or canonical.summary
                alias.source = f"Cùng bản kinh với {canonical.title}; {canonical.source}"
                alias.status = "published"
                alias.reading_minutes = estimate_reading_minutes(canonical.body)
                db.commit()
            res = {
                "slug": alias_slug,
                "status": "alias_updated" if not args.dry_run else "alias_dry_run_ok",
                "new_len": len(canonical.body),
            }
            print(json.dumps(res, ensure_ascii=False))
            results.append(res)

        if args.from_dir:
            dir_results = import_from_dir(db, Path(args.from_dir), args.force, args.dry_run)
            for res in dir_results:
                print(json.dumps(res, ensure_ascii=False))
            results.extend(dir_results)

        # remove demo stub
        demo_res = soft_delete_demo(db, args.dry_run)
        print(json.dumps(demo_res, ensure_ascii=False))
        results.append(demo_res)
        if not args.dry_run:
            db.commit()

        # summary of remaining stubs
        remaining = []
        for s in db.query(Sutra).filter(Sutra.is_deleted.is_(False)).all():
            if len(s.body or "") < 1000:
                remaining.append({"slug": s.slug, "title": s.title, "body_len": len(s.body or "")})
        results.append({"remaining_stubs": remaining})
        print(json.dumps({"remaining_stubs": remaining}, ensure_ascii=False))

        report = art_dir / ("sutra-import-report-dry-run.json" if args.dry_run else "sutra-import-report.json")
        report.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"REPORT={report}")
    finally:
        db.close()



if __name__ == "__main__":
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
