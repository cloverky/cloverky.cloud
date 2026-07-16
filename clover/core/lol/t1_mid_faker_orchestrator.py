"""Faker Orchestrator — vLLM(OpenAI 호환 API)으로 서빙되는 EXAONE-3.5-7.8B-AWQ 오케스트레이터."""

from __future__ import annotations

import os
from collections.abc import Generator
from functools import lru_cache

import httpx

_MODEL = os.getenv("EXAONE_MODEL", "exaone")
_BASE_URL = os.getenv("EXAONE_BASE_URL", "http://localhost:8001/v1")


class FakerOrchestrator:
    def __init__(self, base_url: str = _BASE_URL) -> None:
        self._base_url = base_url
        self._client = httpx.Client(base_url=base_url, timeout=60.0)
        self._async_client = httpx.AsyncClient(base_url=base_url, timeout=60.0)

    def is_ready(self) -> bool:
        try:
            response = self._client.get("/models")
            response.raise_for_status()
            ids = [m["id"] for m in response.json()["data"]]
            return _MODEL in ids
        except Exception:
            return False

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        stream: bool = False,
    ) -> str | Generator[str, None, None]:
        if stream:
            return self._stream(messages)
        print(
            f"[FakerOrchestrator] -> POST {self._base_url}/chat/completions model={_MODEL}"
        )
        response = self._client.post(
            "/chat/completions", json={"model": _MODEL, "messages": messages}
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"] or ""
        print(f"[FakerOrchestrator] <- {len(content)} chars")
        return content

    def _stream(self, messages: list[dict[str, str]]) -> Generator[str, None, None]:
        with self._client.stream(
            "POST",
            "/chat/completions",
            json={"model": _MODEL, "messages": messages, "stream": True},
        ) as response:
            for line in response.iter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json

                    chunk = json.loads(line[len("data: ") :])
                    content = chunk["choices"][0]["delta"].get("content")
                    if content:
                        yield content

    async def achat(self, messages: list[dict[str, str]]) -> str:
        print(
            f"[FakerOrchestrator] -> POST {self._base_url}/chat/completions model={_MODEL}"
        )
        response = await self._async_client.post(
            "/chat/completions", json={"model": _MODEL, "messages": messages}
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"] or ""
        print(f"[FakerOrchestrator] <- {len(content)} chars")
        return content

    async def achat_stream(
        self, messages: list[dict[str, str]]
    ) -> Generator[str, None, None]:
        async with self._async_client.stream(
            "POST",
            "/chat/completions",
            json={"model": _MODEL, "messages": messages, "stream": True},
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    import json

                    chunk = json.loads(line[len("data: ") :])
                    content = chunk["choices"][0]["delta"].get("content")
                    if content:
                        yield content


@lru_cache(maxsize=1)
def get_faker_orchestrator() -> FakerOrchestrator:
    return FakerOrchestrator()
