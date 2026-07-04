"""
Trending signals for the news hub:

1) Hot keywords -> extracted from current article titles (entities/phrases that
   many outlets mention right now). Available immediately, no user data needed.
2) Top searches -> real search counts persisted in SQLite so they survive restarts.
"""
from __future__ import annotations

import re
import sqlite3
import threading
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "news_hub.db"
_DB_LOCK = threading.Lock()

# Vietnamese + generic stopwords to ignore when mining title keywords.
_STOPWORDS = {
    "và", "của", "cho", "các", "những", "được", "với", "trong", "ngoài", "trên",
    "dưới", "khi", "đã", "sẽ", "đang", "là", "có", "không", "một", "này", "đó",
    "từ", "đến", "về", "ra", "vào", "lại", "cũng", "nên", "vì", "do", "bị",
    "the", "a", "an", "of", "to", "in", "on", "for", "and", "vs", "hay", "nào",
    "sau", "trước", "còn", "mà", "thì", "ở", "bằng", "theo", "như", "hơn", "rất",
    "gì", "ai", "sao", "bao", "mới", "người", "việc", "năm", "ngày", "giờ",
    "tại", "để", "làm", "nói", "vừa", "cùng", "giữa", "sự", "tin", "loạt",
}

# Words that are proper-noun-ish (Capitalized) but too generic to be a trend.
_GENERIC_CAPS = {"Việt", "Nam", "Hà", "Nội", "TP", "HCM", "Mỹ", "Trung", "Quốc"}

_TOKEN_RE = re.compile(r"[0-9A-Za-zÀ-ỹ]+")


def _ensure_db() -> None:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(_DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS search_counts (
                term TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0,
                last_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def record_search(term: str) -> None:
    """Increment the counter for a normalized search term."""
    norm = " ".join(term.lower().split())
    if len(norm) < 2 or len(norm) > 60:
        return
    now = datetime.now(timezone.utc).isoformat()
    with _DB_LOCK:
        _ensure_db()
        with sqlite3.connect(_DB_PATH) as conn:
            conn.execute(
                """
                INSERT INTO search_counts (term, count, last_at)
                VALUES (?, 1, ?)
                ON CONFLICT(term) DO UPDATE SET
                    count = count + 1,
                    last_at = excluded.last_at
                """,
                (norm, now),
            )
            conn.commit()


def top_searches(limit: int = 10) -> list[dict[str, Any]]:
    with _DB_LOCK:
        _ensure_db()
        with sqlite3.connect(_DB_PATH) as conn:
            rows = conn.execute(
                "SELECT term, count FROM search_counts ORDER BY count DESC, last_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [{"term": r[0], "count": r[1]} for r in rows]


def _extract_phrases(title: str) -> list[str]:
    """Pull candidate keywords: runs of Capitalized words (names/entities).

    Uses str.isupper() on the first letter so Vietnamese upper/lowercase
    (including accented letters) is detected correctly.
    """
    words = _TOKEN_RE.findall(title)
    runs: list[list[str]] = []
    current: list[str] = []
    for w in words:
        if w[:1].isupper():
            current.append(w)
        else:
            if current:
                runs.append(current)
                current = []
    if current:
        runs.append(current)

    phrases: list[str] = []
    for run in runs:
        meaningful = [w for w in run if w not in _GENERIC_CAPS and len(w) > 1]
        if len(meaningful) >= 2:
            phrases.append(" ".join(meaningful[:4]))
        elif len(meaningful) == 1 and len(meaningful[0]) >= 4:
            phrases.append(meaningful[0])
    return phrases


def hot_keywords(articles: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    """Rank keywords by how many recent titles mention them (multi-outlet = hotter)."""
    counter: Counter[str] = Counter()
    display: dict[str, str] = {}

    for art in articles[:400]:
        title = art.get("title", "")
        seen_in_title: set[str] = set()
        for phrase in _extract_phrases(title):
            key = phrase.lower()
            if key in _STOPWORDS or len(key) < 3:
                continue
            if key in seen_in_title:
                continue
            seen_in_title.add(key)
            counter[key] += 1
            display.setdefault(key, phrase)

    results = []
    for key, count in counter.most_common(limit * 3):
        if count < 2:  # must appear in at least 2 titles to be "trending"
            continue
        results.append({"keyword": display[key], "mentions": count})
        if len(results) >= limit:
            break
    return results