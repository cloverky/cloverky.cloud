from __future__ import annotations

from abc import ABC, abstractmethod


class InsightChainPort(ABC):
    @abstractmethod
    async def run(
        self,
        question: str,
        profile_directive: str,
        market_context: str,
        research_context: str,
    ) -> str:
        """프롬프트 체인을 실행해 답변 텍스트를 반환한다. 실패 시 RuntimeError.

        LangChain 타입은 이 포트를 넘어오지 않는다 — 어댑터 내부에만 존재한다.
        """
        pass
