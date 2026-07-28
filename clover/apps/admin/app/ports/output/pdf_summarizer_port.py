from __future__ import annotations

from abc import ABC, abstractmethod


class PdfSummarizerPort(ABC):
    @abstractmethod
    async def summarize(self, text: str) -> str:
        """텍스트를 한국어로 요약한다. 생성 실패 시 RuntimeError."""
        pass
