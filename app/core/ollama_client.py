"""
Shared Ollama client with sync and async helpers.
"""
from __future__ import annotations

from typing import Any, List

import httpx

from app.core.config import settings
from app.core.logger import logger


class OllamaClient:
    def __init__(self) -> None:
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.llm_model = settings.ollama_llm_model
        self.embed_model = settings.ollama_embed_model
        self.max_tokens = settings.max_tokens
        self.temperature = settings.temperature
        self._async_client = httpx.AsyncClient(timeout=120.0)
        self._sync_client = httpx.Client(timeout=120.0)
        logger.info(
            "Ollama client initialized | llm=%s | embed=%s",
            self.llm_model,
            self.embed_model,
        )

    def _generation_payload(self, prompt: str, model: str | None = None) -> dict[str, Any]:
        return {
            "model": model or self.llm_model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": self.max_tokens,
                "temperature": self.temperature,
            },
        }

    @staticmethod
    def _batched(items: List[str], batch_size: int = 32) -> List[List[str]]:
        return [items[index:index + batch_size] for index in range(0, len(items), batch_size)]

    async def generate(self, prompt: str, model: str | None = None) -> str:
        payload = self._generation_payload(prompt, model=model)
        try:
            response = await self._async_client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except httpx.ConnectError:
            msg = "Không thể kết nối tới Ollama. Hãy chạy `ollama serve` và tải model cần dùng."
            logger.error(msg)
            return msg
        except Exception as exc:
            logger.error("Ollama generate error: %s", exc)
            return f"Lỗi LLM: {exc}"

    def generate_sync(self, prompt: str, model: str | None = None) -> str:
        payload = self._generation_payload(prompt, model=model)
        try:
            response = self._sync_client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()
            return response.json().get("response", "").strip()
        except httpx.ConnectError:
            msg = "Không thể kết nối tới Ollama. Hãy chạy `ollama serve`."
            logger.error(msg)
            return msg
        except Exception as exc:
            logger.error("Ollama sync generate error: %s", exc)
            return f"Lỗi LLM: {exc}"

    async def embed(self, text: str) -> List[float]:
        try:
            response = await self._async_client.post(
                f"{self.base_url}/v1/embeddings",
                json={"model": self.embed_model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            items = data.get("data", [])
            if items:
                return items[0].get("embedding", [])
        except Exception as exc:
            logger.warning("Ollama embed via /v1/embeddings failed: %s", exc)

        try:
            response = await self._async_client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.embed_model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings", [])
            if embeddings:
                return embeddings[0]
        except Exception as exc:
            logger.warning("Ollama embed via /api/embed failed: %s", exc)

        try:
            response = await self._async_client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embed_model, "prompt": text},
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
        except Exception as exc:
            logger.error("Ollama embed error: %s", exc)
            return []

    def embed_sync(self, text: str) -> List[float]:
        try:
            response = self._sync_client.post(
                f"{self.base_url}/v1/embeddings",
                json={"model": self.embed_model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            items = data.get("data", [])
            if items:
                return items[0].get("embedding", [])
        except Exception as exc:
            logger.warning("Ollama sync embed via /v1/embeddings failed: %s", exc)

        try:
            response = self._sync_client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.embed_model, "input": text},
            )
            response.raise_for_status()
            data = response.json()
            embeddings = data.get("embeddings", [])
            if embeddings:
                return embeddings[0]
        except Exception as exc:
            logger.warning("Ollama sync embed via /api/embed failed: %s", exc)

        try:
            response = self._sync_client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embed_model, "prompt": text},
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
        except Exception as exc:
            logger.error("Ollama sync embed error: %s", exc)
            return []

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for batch in self._batched(texts):
            try:
                response = await self._async_client.post(
                    f"{self.base_url}/v1/embeddings",
                    json={"model": self.embed_model, "input": batch},
                )
                response.raise_for_status()
                data = response.json().get("data", [])
                if data:
                    vectors.extend(item.get("embedding", []) for item in data)
                    continue
            except Exception as exc:
                logger.warning("Ollama async batch embed failed, falling back item-by-item: %s", exc)

            for text in batch:
                vectors.append(await self.embed(text))
        return vectors

    def embed_batch_sync(self, texts: List[str]) -> List[List[float]]:
        vectors: List[List[float]] = []
        for batch in self._batched(texts):
            try:
                response = self._sync_client.post(
                    f"{self.base_url}/v1/embeddings",
                    json={"model": self.embed_model, "input": batch},
                )
                response.raise_for_status()
                data = response.json().get("data", [])
                if data:
                    vectors.extend(item.get("embedding", []) for item in data)
                    continue
            except Exception as exc:
                logger.warning("Ollama sync batch embed failed, falling back item-by-item: %s", exc)

            for text in batch:
                vectors.append(self.embed_sync(text))
        return vectors

    async def is_available(self) -> bool:
        try:
            response = await self._async_client.get(f"{self.base_url}/api/tags", timeout=5.0)
            return response.status_code == 200
        except Exception:
            return False

    def is_available_sync(self) -> bool:
        try:
            response = self._sync_client.get(f"{self.base_url}/api/tags", timeout=5.0)
            return response.status_code == 200
        except Exception:
            return False

    async def close(self) -> None:
        await self._async_client.aclose()
        self._sync_client.close()


_ollama_client: OllamaClient | None = None


def get_ollama_client() -> OllamaClient:
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
