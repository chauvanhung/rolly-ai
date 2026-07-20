"""In-memory rate limiter for public write endpoints (no Redis required).

For multi-instance production, replace with Redis/slowapi later.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, limit: int, window_seconds: int) -> bool:
        now = time.time()
        with self._lock:
            q = self._hits[key]
            cutoff = now - window_seconds
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            # opportunistic prune of empty keys is skipped (bounded by unique IPs)
            return True


limiter = InMemoryRateLimiter()


def client_ip(request: Request) -> str:
    """Prefer Cloudflare / reverse-proxy real IP, then direct peer."""
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int = 5,
    window_seconds: int = 60,
) -> None:
    ip = client_ip(request)
    key = f"{scope}:{ip}"
    if not limiter.allow(key, limit=limit, window_seconds=window_seconds):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Quá nhiều yêu cầu. Vui lòng thử lại sau {window_seconds} giây.",
            headers={"Retry-After": str(window_seconds)},
        )
