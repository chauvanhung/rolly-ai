"""
Creates text embeddings using Ollama.
"""
from __future__ import annotations

from typing import List

import numpy as np

from app.core.logger import logger
from app.core.ollama_client import get_ollama_client


async def embed_texts_async(texts: List[str]) -> np.ndarray:
    client = get_ollama_client()
    logger.info("Embedding %s chunks asynchronously", len(texts))
    vectors = await client.embed_batch(texts)
    if not vectors or not vectors[0]:
        raise ValueError("Ollama tra ve embedding rong.")
    return np.array(vectors, dtype=np.float32)


def embed_texts(texts: List[str]) -> np.ndarray:
    client = get_ollama_client()
    logger.info("Embedding %s chunks", len(texts))
    vectors = client.embed_batch_sync(texts)
    if not vectors or not vectors[0]:
        raise ValueError("Ollama tra ve embedding rong.")
    return np.array(vectors, dtype=np.float32)


async def embed_query_async(query: str) -> np.ndarray:
    vec = await get_ollama_client().embed(query)
    if not vec:
        raise ValueError("Khong tao duoc embedding cho truy van.")
    return np.array([vec], dtype=np.float32)
