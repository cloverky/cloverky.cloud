from __future__ import annotations

from abc import ABC, abstractmethod


class TerranVesselGeminiGatewayPort(ABC):
    @abstractmethod
    async def ask(self, question: str) -> str:
        """질문 텍스트를 받아 Gemini 응답 텍스트를 반환"""
        pass
