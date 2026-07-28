"""LLM 채팅 게이트웨이 — EXAONE 우선, 실패 시 Ollama·Gemini로 폴백."""

from __future__ import annotations

import logging
import os

import httpx
from admin.app.ports.output.chat_llm_port import ChatLlmPort

from core.lol.t1_mid_faker_orchestrator import FakerOrchestrator
from core.matrix.keymaker_api import get_keymaker

logger = logging.getLogger(__name__)

# Ollama의 OpenAI 호환 엔드포인트. compose는 OLLAMA_HOST로 호스트를 가리킨다.
_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL") or (
    os.getenv("OLLAMA_HOST", "http://ollama:11434").rstrip("/") + "/v1"
)
_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:4b")
# 폴백 경로는 콜드 스타트와 thinking 토큰 생성을 포함한다 (로컬 실측 수 분).
_OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "900"))
# 로컬 LLM(EXAONE·Ollama)이 없는 배포 환경의 최종 폴백.
# gemini-2.0-flash 는 무료 티어 쿼터가 0, gemini-2.5-flash 계열은 단종(404)이라
# 별칭 모델을 기본값으로 둔다.
_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")


class ExaoneChatGateway(ChatLlmPort):
    """vLLM으로 서빙되는 EXAONE (core.lol.FakerOrchestrator)."""

    def __init__(self, orchestrator: FakerOrchestrator) -> None:
        self._orchestrator = orchestrator

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        content = await self._orchestrator.achat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        answer = content.strip()
        if not answer:
            raise RuntimeError("EXAONE이 빈 응답을 반환했습니다.")
        return answer


class OllamaChatGateway(ChatLlmPort):
    """Ollama OpenAI 호환 엔드포인트 — EXAONE 폴백용."""

    def __init__(
        self,
        base_url: str = _OLLAMA_BASE_URL,
        model: str = _OLLAMA_MODEL,
        timeout: float = _OLLAMA_TIMEOUT,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                f"{self._base_url}/chat/completions", json=payload
            )
            response.raise_for_status()
            data = response.json()
        answer = str(data["choices"][0]["message"]["content"] or "").strip()
        if not answer:
            raise RuntimeError("Ollama가 빈 응답을 반환했습니다.")
        return answer


class GeminiChatGateway(ChatLlmPort):
    """Gemini — 로컬 LLM을 띄울 수 없는 배포 환경의 폴백."""

    def __init__(self, model: str = _GEMINI_MODEL) -> None:
        self._model = model

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        from google.genai import types

        keymaker = get_keymaker()
        if not keymaker.is_gemini_ready():
            raise RuntimeError(
                "GEMINI_API_KEY가 설정되지 않았습니다. clover/.env 에 키를 넣어 주세요."
            )
        client = keymaker.get_gemini_client()
        response = await client.aio.models.generate_content(
            model=self._model,
            contents=user_prompt,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        )
        answer = (response.text or "").strip()
        if not answer:
            raise RuntimeError("Gemini가 빈 응답을 반환했습니다.")
        return answer


class FallbackChatGateway(ChatLlmPort):
    """앞선 게이트웨이가 실패하면 다음 게이트웨이로 넘어간다."""

    def __init__(self, *gateways: ChatLlmPort) -> None:
        if not gateways:
            raise ValueError("게이트웨이가 최소 하나 필요하다")
        self._gateways = gateways

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        last_error: Exception | None = None
        for gateway in self._gateways:
            try:
                return await gateway.complete(system_prompt, user_prompt)
            except Exception as exc:  # noqa: BLE001 — 다음 게이트웨이로 폴백
                # 타임아웃 예외는 str()이 비어 있어 타입까지 함께 남긴다.
                logger.warning(
                    "LLM 게이트웨이 실패 — %s: %s(%s)",
                    type(gateway).__name__,
                    type(exc).__name__,
                    exc,
                )
                last_error = exc
        raise RuntimeError(
            f"모든 LLM 게이트웨이가 실패했습니다: "
            f"{type(last_error).__name__}({last_error})"
        )
