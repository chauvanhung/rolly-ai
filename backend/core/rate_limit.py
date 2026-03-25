from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from backend.core.config import settings

_REQUEST_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


def enforce_rate_limit(request: Request, scope: str = "default") -> None:
    client_host = request.client.host if request.client else "unknown"
    key = f"{scope}:{client_host}"
    now = time.time()
    bucket = _REQUEST_BUCKETS[key]
    window_start = now - settings.rate_limit_window_seconds

    while bucket and bucket[0] < window_start:
        bucket.popleft()

    if len(bucket) >= settings.rate_limit_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
        )
    bucket.append(now)
