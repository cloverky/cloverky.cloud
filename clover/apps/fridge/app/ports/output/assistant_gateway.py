from __future__ import annotations

from abc import ABC, abstractmethod


class AssistantGatewayPort(ABC):
    @abstractmethod
    async def chat(self, messages: list[dict[str, str]]) -> str:
        """대화 메시지 목록을 받아 LLM 응답 텍스트를 반환"""
        pass
