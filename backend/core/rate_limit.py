from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status
from redis import Redis
from redis.exceptions import RedisError

from backend.core.config import settings

_REQUEST_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_REQUEST_BUCKETS_LOCK = Lock()
_REDIS_CLIENT: Redis | None = None
_REDIS_DISABLED = False


def enforce_rate_limit(
    request: Request,
    scope: str = "default",
    *,
    limit: int | None = None,
    window_seconds: int | None = None,
) -> None:
    effective_limit = max(1, int(limit if limit is not None else settings.rate_limit_requests))
    effective_window_seconds = max(1, int(window_seconds if window_seconds is not None else settings.rate_limit_window_seconds))
    client_key = _get_client_key(request)
    key = f"{scope}:{client_key}"

    if _enforce_rate_limit_with_redis(key, effective_limit, effective_window_seconds):
        return

    now = time.time()
    window_start = now - effective_window_seconds

    with _REQUEST_BUCKETS_LOCK:
        bucket = _REQUEST_BUCKETS[key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()

        if len(bucket) >= effective_limit:
            _raise_rate_limit_exceeded()

        bucket.append(now)


def _enforce_rate_limit_with_redis(key: str, limit: int, window_seconds: int) -> bool:
    redis_client = _get_redis_client()
    if redis_client is None:
        return False

    redis_key = f"expense:rate-limit:{key}"
    try:
        current_count = int(redis_client.incr(redis_key))
        if current_count == 1:
            redis_client.expire(redis_key, window_seconds)
        if current_count > limit:
            _raise_rate_limit_exceeded()
        return True
    except RedisError:
        return False


def _get_client_key(request: Request) -> str:
    # SECURITY: the rate-limit key must not be attacker-controlled. This origin is reachable only
    # through Cloudflare -> Caddy, and Cloudflare overwrites CF-Connecting-IP with the real peer
    # (a client cannot spoof it through the edge). We therefore trust CF-Connecting-IP only.
    # X-Forwarded-For / X-Real-IP are deliberately NOT trusted: their left-most value is set by
    # the client, and keying off it let an attacker rotate the header to get a fresh bucket on
    # every request, defeating the login/reset brute-force limits.
    cf_ip = request.headers.get("cf-connecting-ip", "").strip()
    if cf_ip:
        return cf_ip

    if request.client and request.client.host:
        return request.client.host

    return "unknown"


def _get_redis_client() -> Redis | None:
    global _REDIS_CLIENT, _REDIS_DISABLED

    if _REDIS_DISABLED:
        return None
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    redis_url = str(settings.redis_url or "").strip()
    if not redis_url:
        _REDIS_DISABLED = True
        return None

    try:
        client = Redis.from_url(redis_url, decode_responses=True, socket_timeout=1, socket_connect_timeout=1)
        client.ping()
    except RedisError:
        _REDIS_DISABLED = True
        return None

    _REDIS_CLIENT = client
    return _REDIS_CLIENT


def _raise_rate_limit_exceeded() -> None:
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
    )
