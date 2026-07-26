"""
News Hub API - aggregates trending Vietnamese news from public RSS feeds.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from app.ratelimit import enforce as rate_limit
from app.aggregator import cache_info, refresh_articles
from app.sources import TOPICS
from app.trending import hot_keywords, record_search, top_searches
from app.google_trends import refresh_search_trends
from app.topic_trends import refresh_topic_trends, topic_trends_status
from app.traffic import refresh_traffic, traffic_status

app = FastAPI(title="News Hub API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/trends-status")
async def trends_status() -> dict[str, object]:
    """Diagnostics: last fetch time and item counts for topic trends."""
    return topic_trends_status()


@app.get("/api/traffic")
async def traffic(
    city: str | None = Query(default=None, max_length=60),
    limit: int = Query(default=30, ge=1, le=60),
) -> dict[str, object]:
    """Traffic-incident articles: jams, accidents, closures, flooded roads."""
    items = await refresh_traffic(city=city, limit=limit)
    return {"city": city, "count": len(items), "items": items}


@app.get("/api/traffic-status")
async def traffic_status_endpoint() -> dict[str, object]:
    return traffic_status()


@app.get("/api/topics")
async def list_topics() -> dict[str, list[dict[str, str]]]:
    return {"topics": [{"key": k, "label": v} for k, v in TOPICS.items()]}


@app.get("/api/hot")
async def hot(
    limit: int = Query(default=30, ge=1, le=100),
    topic: str | None = Query(default=None),
) -> dict[str, object]:
    articles = await refresh_articles()
    if topic:
        if topic not in TOPICS:
            raise HTTPException(status_code=404, detail="Chủ đề không tồn tại.")
        articles = [a for a in articles if a["topic"] == topic]
    return {
        "topic": topic,
        "count": len(articles[:limit]),
        "articles": articles[:limit],
        "cache": cache_info(),
    }


@app.get("/api/trending")
async def trending(
    keyword_limit: int = Query(default=12, ge=1, le=30),
    search_limit: int = Query(default=10, ge=1, le=30),
) -> dict[str, object]:
    articles = await refresh_articles()
    search_trends = await refresh_search_trends()
    topic_trends = await refresh_topic_trends()
    return {
        "search_trends": search_trends[:15],
        "topic_trends": topic_trends,
        "hot_keywords": hot_keywords(articles, limit=keyword_limit),
        "top_searches": top_searches(limit=search_limit),
    }


@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=2, max_length=80),
    limit: int = Query(default=30, ge=1, le=100),
) -> dict[str, object]:
    articles = await refresh_articles()
    needle = q.lower().strip()
    matched = [
        a for a in articles
        if needle in a["title"].lower() or needle in a["summary"].lower()
    ]
    # Only count searches that actually returned results (reduces noise/typos).
    if matched:
        record_search(q)
    return {"query": q, "count": len(matched[:limit]), "articles": matched[:limit]}


@app.post("/api/refresh")
async def refresh(request: Request) -> dict[str, object]:
    rate_limit(request, "refresh", limit=5, window_seconds=60)
    articles = await refresh_articles(force=True)
    return {"refreshed": True, "count": len(articles), "cache": cache_info()}