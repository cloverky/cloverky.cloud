from __future__ import annotations

from abc import ABC, abstractmethod


class SemanticRouterLlmPort(ABC):
    @abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """시스템/유저 프롬프트를 받아 LLM 원문 응답 텍스트를 반환"""
        pass
