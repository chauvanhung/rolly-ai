"""
FAISS vector store management.
"""
from __future__ import annotations

import os
import pickle
from collections import defaultdict
from typing import List, Optional, Tuple

import faiss
import numpy as np
from rank_bm25 import BM25Okapi

from app.core.config import settings
from app.core.logger import logger
from app.rag.embedder import embed_texts
from app.rag.legal_domains import detect_text_domains
from app.rag.lexical import tokenize_vietnamese
from app.rag.loader import load_law_documents

INDEX_FILE = os.path.join(settings.faiss_index_path, "index.faiss")
META_FILE = os.path.join(settings.faiss_index_path, "metadata.pkl")


class FAISSVectorStore:
    def __init__(self) -> None:
        self.index: Optional[faiss.Index] = None
        self.metadata: List[Tuple[str, str]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.bm25_corpus: List[List[str]] = []
        self.is_ready = False

    @staticmethod
    def _downsample_chunks(chunks: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
        max_chunks = max(0, settings.max_index_chunks)
        if max_chunks <= 0 or len(chunks) <= max_chunks:
            return chunks

        focused_ratio = min(max(settings.focused_index_ratio, 0.0), 1.0)
        focused_quota = int(max_chunks * focused_ratio)
        selected: list[Tuple[str, str]] = []
        seen: set[Tuple[str, str]] = set()

        buckets: dict[str, list[Tuple[str, str]]] = defaultdict(list)
        general_chunks: list[Tuple[str, str]] = []

        for text, source in chunks:
            domains = detect_text_domains(text, source)
            if domains:
                for domain in domains:
                    buckets[domain].append((text, source))
            else:
                general_chunks.append((text, source))

        if buckets and focused_quota > 0:
            per_bucket = max(1, focused_quota // len(buckets))
            for domain, bucket in buckets.items():
                take = min(per_bucket, len(bucket))
                if take <= 0:
                    continue
                step = len(bucket) / take
                for i in range(take):
                    item = bucket[min(int(i * step), len(bucket) - 1)]
                    if item not in seen:
                        selected.append(item)
                        seen.add(item)
            logger.info(
                "Focused sampling kept %s chunks across %s legal domain bucket(s)",
                len(selected),
                len(buckets),
            )

        remaining_quota = max_chunks - len(selected)
        if remaining_quota > 0:
            remaining_pool = [item for item in chunks if item not in seen]
            step = len(remaining_pool) / remaining_quota
            for i in range(remaining_quota):
                item = remaining_pool[min(int(i * step), len(remaining_pool) - 1)]
                if item not in seen:
                    selected.append(item)
                    seen.add(item)

        sampled = selected[:max_chunks]
        logger.info(
            "Sampling %s/%s chunks for indexing to fit local hardware | focused_ratio=%.2f",
            len(sampled),
            len(chunks),
            focused_ratio,
        )
        return sampled

    def _build_bm25(self) -> None:
        corpus: List[List[str]] = []
        for text, source in self.metadata:
            tokens = tokenize_vietnamese(f"{source} {text[:2000]}")
            corpus.append(tokens if tokens else ["_"])
        self.bm25_corpus = corpus
        self.bm25 = BM25Okapi(corpus) if corpus else None
        logger.info("BM25 index built for %s chunks", len(corpus))

    def build_from_documents(self) -> bool:
        chunks = load_law_documents()
        if not chunks:
            logger.warning("No legal documents found for indexing.")
            self.index = None
            self.metadata = []
            self.bm25 = None
            self.bm25_corpus = []
            self.is_ready = False
            return False

        chunks = self._downsample_chunks(chunks)
        vectors = embed_texts([text for text, _source in chunks])
        if vectors.size == 0:
            self.index = None
            self.metadata = []
            self.bm25 = None
            self.bm25_corpus = []
            self.is_ready = False
            return False

        dim = int(vectors.shape[1])
        self.index = faiss.IndexFlatL2(dim)
        self.index.add(vectors)
        self.metadata = chunks
        self._build_bm25()
        os.makedirs(settings.faiss_index_path, exist_ok=True)
        faiss.write_index(self.index, INDEX_FILE)
        with open(META_FILE, "wb") as fh:
            pickle.dump(self.metadata, fh)

        self.is_ready = True
        logger.info("FAISS index built with %s vectors", self.index.ntotal)
        return True

    def load_from_disk(self) -> bool:
        if not os.path.exists(INDEX_FILE) or not os.path.exists(META_FILE):
            logger.info("FAISS index not found on disk. Rebuilding.")
            return self.build_from_documents()

        try:
            self.index = faiss.read_index(INDEX_FILE)
            with open(META_FILE, "rb") as fh:
                self.metadata = pickle.load(fh)
            self._build_bm25()
            self.is_ready = True
            logger.info("FAISS index loaded with %s vectors", self.index.ntotal)
            return True
        except Exception as exc:
            logger.error("Failed to load FAISS index: %s", exc)
            return self.build_from_documents()

    def search(self, query_vector: np.ndarray, top_k: int | None = None) -> List[Tuple[str, str, float]]:
        if not self.is_ready or self.index is None:
            return []

        limit = top_k or settings.rag_top_k
        distances, indices = self.index.search(query_vector, limit)
        results: List[Tuple[str, str, float]] = []
        for distance, index in zip(distances[0], indices[0]):
            if 0 <= index < len(self.metadata):
                text, source = self.metadata[index]
                results.append((text, source, float(distance)))
        return results

    def search_bm25(self, query_tokens: List[str], top_k: int | None = None) -> List[Tuple[str, str, float]]:
        if not self.is_ready or self.bm25 is None or not query_tokens:
            return []

        limit = top_k or settings.rag_top_k
        scores = self.bm25.get_scores(query_tokens)
        if len(scores) == 0:
            return []

        top_indices = np.argsort(scores)[::-1][:limit]
        results: List[Tuple[str, str, float]] = []
        for index in top_indices:
            idx = int(index)
            if 0 <= idx < len(self.metadata):
                text, source = self.metadata[idx]
                results.append((text, source, float(scores[idx])))
        return results


_vector_store: Optional[FAISSVectorStore] = None


def get_vector_store() -> FAISSVectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = FAISSVectorStore()
    return _vector_store


def initialize_vector_store() -> bool:
    return get_vector_store().load_from_disk()
