"""
Google Trends (Vietnam) — real-world daily search trends.

Uses the public Google Trends RSS feed (no API key). Each trend carries the
search term, an approximate traffic figure, a picture, and related news items.
Results are cached to avoid hammering the feed.
"""
from __future__ import annotations

import re
import time
import unicodedata
import xml.etree.ElementTree as ET
from typing import Any

import httpx

TRENDS_URL = "https://trends.google.com/trending/rss?geo=VN"
_HT_NS = "https://trends.google.com/trending/rss"

_CACHE: dict[str, Any] = {"trends": [], "fetched_at": 0.0}
_CACHE_TTL_SECONDS = 600  # 10 minutes


def _clean(text: str | None) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    return re.sub(r"\s+", " ", text).strip()


def _traffic_to_int(raw: str) -> int:
    """Convert '500+', '2K+', '1M+' to an integer for sorting."""
    if not raw:
        return 0
    s = raw.replace("+", "").replace(",", "").strip().upper()
    mult = 1
    if s.endswith("K"):
        mult, s = 1000, s[:-1]
    elif s.endswith("M"):
        mult, s = 1_000_000, s[:-1]
    try:
        return int(float(s) * mult)
    except ValueError:
        return 0


async def refresh_search_trends(force: bool = False) -> list[dict[str, Any]]:
    now = time.time()
    if not force and _CACHE["trends"] and (now - _CACHE["fetched_at"]) < _CACHE_TTL_SECONDS:
        return _CACHE["trends"]

    headers = {"User-Agent": "Mozilla/5.0 (compatible; NewsHub/1.0; +https://news.rollyhub.com)"}
    try:
        async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
            resp = await client.get(TRENDS_URL, follow_redirects=True)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
    except Exception:
        # On failure, keep whatever we had cached (may be empty).
        return _CACHE["trends"]

    trends: list[dict[str, Any]] = []
    for item in root.iter("item"):
        title = _clean(item.findtext("title"))
        if not title:
            continue
        traffic = _clean(item.findtext(f"{{{_HT_NS}}}approx_traffic"))
        picture = _clean(item.findtext(f"{{{_HT_NS}}}picture"))

        related: list[dict[str, str]] = []
        for news in item.findall(f"{{{_HT_NS}}}news_item"):
            n_title = _clean(news.findtext(f"{{{_HT_NS}}}news_item_title"))
            n_url = _clean(news.findtext(f"{{{_HT_NS}}}news_item_url"))
            n_source = _clean(news.findtext(f"{{{_HT_NS}}}news_item_source"))
            if n_title and n_url:
                related.append({"title": n_title, "url": n_url, "source": n_source})

        trends.append(
            {
                "term": title,
                "traffic": traffic,
                "traffic_value": _traffic_to_int(traffic),
                "picture": picture or None,
                "related": related[:3],
            }
        )

    trends.sort(key=lambda t: t["traffic_value"], reverse=True)
    _CACHE["trends"] = trends
    _CACHE["fetched_at"] = time.time()
    return trends