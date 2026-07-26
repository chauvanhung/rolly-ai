"""Lightweight per-IP sliding-window rate limiter (in-memory, single process).

The Legal AI endpoints are unauthenticated. /ask runs an LLM (+ optional SQL/RAG), /ingest
rebuilds the whole FAISS index (CPU/IO heavy) and /schedule creates recurring jobs — all
trivially abusable for DoS/automation without a cap.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def _client_ip(request: Request) -> str:
    cf = request.headers.get("cf-connecting-ip", "").strip()
    if cf:
        return cf
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce(request: Request, scope: str, *, limit: int, window_seconds: int) -> None:
    key = f"{scope}:{_client_ip(request)}"
    now = time.time()
    window_start = now - window_seconds
    with _LOCK:
        bucket = _BUCKETS[key]
        while bucket and bucket[0] < window_start:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau.",
            )
        bucket.append(now)
