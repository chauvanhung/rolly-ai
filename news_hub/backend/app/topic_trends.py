"""
Topic trends via Google News RSS search (free, no API key).

Google Trends RSS only exposes one aggregate list for a country and cannot be
filtered by category. To surface what is trending in specific areas such as
TikTok/viral culture and technology, we query Google News search RSS per topic
and return the freshest headlines (deduplicated). Results are cached.
"""
from __future__ import annotations

import asyncio
import re
import time
import unicodedata
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Any

import httpx

# Each topic maps to a Google News search query. hl/gl/ceid pin the results to
# Vietnamese language and the Vietnam edition.
TOPIC_QUERIES: list[dict[str, str]] = [
    {"key": "tiktok", "label": "TikTok & Viral", "icon": "🎵",
     "query": "tiktok OR \"trend tiktok\" OR viral"},
    {"key": "cong-nghe", "label": "Công nghệ & AI", "icon": "💻",
     "query": "công nghệ OR AI OR iPhone OR Samsung OR ChatGPT"},
    {"key": "giai-tri", "label": "Giải trí", "icon": "🎬",
     "query": "showbiz OR ca sĩ OR phim OR concert"},
    {"key": "game", "label": "Game & eSports", "icon": "🎮",
     "query": "eSports OR \"game mobile\" OR \"tựa game\" OR \"Liên Quân Mobile\" OR \"Liên Minh Huyền Thoại\""},
    {"key": "the-thao", "label": "Thể thao", "icon": "⚽",
     "query": "bóng đá OR \"V-League\" OR \"tuyển Việt Nam\" OR Ngoại hạng Anh"},
    {"key": "kinh-doanh", "label": "Kinh doanh", "icon": "📈",
     "query": "chứng khoán OR \"giá vàng\" OR doanh nghiệp OR kinh tế"},
    {"key": "suc-khoe", "label": "Sức khỏe", "icon": "🩺",
     "query": "sức khỏe OR bệnh OR dịch OR \"dinh dưỡng\""},
]

_BASE = "https://news.google.com/rss/search"
_CACHE: dict[str, Any] = {"topics": [], "fetched_at": 0.0}
_CACHE_TTL_SECONDS = 600  # 10 minutes


def _clean(text: str | None) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    return re.sub(r"\s+", " ", text).strip()


def _dedupe_key(title: str) -> str:
    """Normalize a title for duplicate detection (lowercase, strip punctuation)."""
    t = unicodedata.normalize("NFC", title).lower()
    t = re.sub(r"[^\w\s]", " ", t, flags=re.UNICODE)
    return re.sub(r"\s+", " ", t).strip()


def _split_title(raw: str) -> tuple[str, str]:
    """Google News titles look like 'Headline - Source'. Split off the source."""
    raw = _clean(raw)
    idx = raw.rfind(" - ")
    if idx > 0:
        return raw[:idx].strip(), raw[idx + 3:].strip()
    return raw, ""


def _build_url(query: str) -> str:
    params = urllib.parse.urlencode(
        {"q": query, "hl": "vi", "gl": "VN", "ceid": "VN:vi"}
    )
    return f"{_BASE}?{params}"


async def _fetch_topic(client: httpx.AsyncClient, spec: dict[str, str], limit: int) -> dict[str, Any]:
    items: list[dict[str, str]] = []
    seen: set[str] = set()
    try:
        resp = await client.get(_build_url(spec["query"]), follow_redirects=True)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        for item in root.iter("item"):
            title_raw = item.findtext("title") or ""
            title, src_from_title = _split_title(title_raw)
            if not title:
                continue
            key = _dedupe_key(title)
            if not key or key in seen:
                continue
            seen.add(key)
            link = _clean(item.findtext("link"))
            src_el = item.find("{*}source")
            source = _clean(src_el.text) if src_el is not None else src_from_title
            pub = _clean(item.findtext("pubDate"))
            items.append({"title": title, "url": link, "source": source, "published": pub})
            if len(items) >= limit:
                break
    except Exception:
        items = []
    return {
        "key": spec["key"],
        "label": spec["label"],
        "icon": spec.get("icon", ""),
        "items": items,
    }


async def refresh_topic_trends(force: bool = False, limit: int = 6) -> list[dict[str, Any]]:
    now = time.time()
    if not force and _CACHE["topics"] and (now - _CACHE["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _CACHE["topics"]

    headers = {"User-Agent": "Mozilla/5.0 (compatible; NewsHub/1.0; +https://news.rollyhub.com)"}
    topics: list[dict[str, Any]] = []
    try:
        async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
            # Fetch all topics concurrently to keep latency low.
            results = await asyncio.gather(
                *[_fetch_topic(client, spec, limit) for spec in TOPIC_QUERIES]
            )
            topics = list(results)
    except Exception:
        return _CACHE["topics"]

    # Keep only if something came back; otherwise keep the previous cache.
    if any(t["items"] for t in topics):
        _CACHE["topics"] = topics
        _CACHE["fetched_at"] = time.time()
    return _CACHE["topics"] or topics


def topic_trends_status() -> dict[str, Any]:
    """Diagnostic info: when topic trends were last fetched and how many items."""
    fetched_at = _CACHE["fetched_at"]
    topics = _CACHE["topics"]
    return {
        "fetched_at": fetched_at,
        "age_seconds": round(time.time() - fetched_at, 1) if fetched_at else None,
        "ttl_seconds": _CACHE_TTL_SECONDS,
        "topic_count": len(topics),
        "items_per_topic": {t["key"]: len(t["items"]) for t in topics},
    }
