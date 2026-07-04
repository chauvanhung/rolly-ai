"""
News aggregator: fetch RSS feeds, normalize articles, rank "hot" items, cache.
"""
from __future__ import annotations

import asyncio
import html
import unicodedata
import re
import time
from datetime import datetime, timezone
from typing import Any

import feedparser
import httpx

from app.sources import RSS_FEEDS, TOPICS

_CACHE: dict[str, Any] = {"articles": [], "fetched_at": 0.0}
_CACHE_TTL_SECONDS = 300  # 5 minutes
_FETCH_LOCK = asyncio.Lock()

_TAG_RE = re.compile(r"<[^>]+>")


def _clean_text(raw: str | None) -> str:
    if not raw:
        return ""
    text = _TAG_RE.sub(" ", raw)
    text = html.unescape(text)
    text = unicodedata.normalize("NFC", text)
    return re.sub(r"\s+", " ", text).strip()


def _parse_published(entry: Any) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        value = entry.get(key)
        if value:
            try:
                return datetime.fromtimestamp(time.mktime(value), tz=timezone.utc)
            except (TypeError, ValueError, OverflowError):
                continue
    return None


def _image_from_entry(entry: Any) -> str | None:
    media = entry.get("media_content") or entry.get("media_thumbnail")
    if media and isinstance(media, list) and media:
        url = media[0].get("url")
        if url:
            return url
    for link in entry.get("links", []) or []:
        if str(link.get("type", "")).startswith("image") and link.get("href"):
            return link["href"]
    summary = entry.get("summary", "")
    match = re.search(r'<img[^>]+src="([^"]+)"', summary)
    if match:
        return match.group(1)
    return None


def _score(published: datetime | None, now: datetime) -> float:
    """Hotness score: newer = higher, decaying over ~48h."""
    if not published:
        return 0.0
    age_hours = max(0.0, (now - published).total_seconds() / 3600.0)
    # simple exponential decay, half-life ~ 12h
    return 100.0 * (0.5 ** (age_hours / 12.0))


async def _fetch_feed(client: httpx.AsyncClient, feed: dict[str, str], now: datetime) -> list[dict[str, Any]]:
    try:
        resp = await client.get(feed["url"], timeout=12.0, follow_redirects=True)
        resp.raise_for_status()
    except Exception:
        return []

    parsed = feedparser.parse(resp.content)
    articles: list[dict[str, Any]] = []
    for entry in parsed.entries[:40]:
        title = _clean_text(entry.get("title"))
        link = entry.get("link", "")
        if not title or not link:
            continue
        published = _parse_published(entry)
        articles.append(
            {
                "title": title,
                "url": link,
                "summary": _clean_text(entry.get("summary"))[:300],
                "image": _image_from_entry(entry),
                "source": feed["source"],
                "topic": feed["topic"],
                "topic_label": TOPICS.get(feed["topic"], feed["topic"]),
                "published_at": published.isoformat() if published else None,
                "score": round(_score(published, now), 2),
            }
        )
    return articles


def _dedupe(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for art in articles:
        key = art["url"].split("?")[0]
        if key in seen:
            continue
        seen.add(key)
        unique.append(art)
    return unique


async def refresh_articles(force: bool = False) -> list[dict[str, Any]]:
    now_ts = time.time()
    if not force and _CACHE["articles"] and (now_ts - _CACHE["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _CACHE["articles"]

    async with _FETCH_LOCK:
        # Re-check after acquiring lock (another task may have refreshed).
        now_ts = time.time()
        if not force and _CACHE["articles"] and (now_ts - _CACHE["fetched_at"]) < _CACHE_TTL_SECONDS:
            return _CACHE["articles"]

        now = datetime.now(timezone.utc)
        headers = {"User-Agent": "NewsHub/1.0 (+https://news.rollyhub.com)"}
        async with httpx.AsyncClient(headers=headers) as client:
            results = await asyncio.gather(
                *[_fetch_feed(client, feed, now) for feed in RSS_FEEDS]
            )

        articles = [art for group in results for art in group]
        articles = _dedupe(articles)
        articles.sort(key=lambda a: a["score"], reverse=True)

        _CACHE["articles"] = articles
        _CACHE["fetched_at"] = time.time()
        return articles


def cache_info() -> dict[str, Any]:
    return {
        "count": len(_CACHE["articles"]),
        "fetched_at": (
            datetime.fromtimestamp(_CACHE["fetched_at"], tz=timezone.utc).isoformat()
            if _CACHE["fetched_at"]
            else None
        ),
        "ttl_seconds": _CACHE_TTL_SECONDS,
    }