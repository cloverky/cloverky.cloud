from __future__ import annotations

import os

import httpx

from star_craft.app.ports.output.semantic_router_gateway import SemanticRouterLlmPort

# Ollama의 OpenAI 호환 엔드포인트 (compose 서비스명 ollama). 필요 시 env로 오버라이드.
_BASE_URL = os.getenv("QWEN_BASE_URL", "http://ollama:11434/v1")
_MODEL = os.getenv("QWEN_MODEL", "qwen2.5:1.5b-instruct")


class QwenSemanticRouterGateway(SemanticRouterLlmPort):
    def __init__(self, base_url: str = _BASE_URL, model: str = _MODEL) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{self._base_url}/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
        content = data["choices"][0]["message"]["content"]
        return str(content or "").strip()
