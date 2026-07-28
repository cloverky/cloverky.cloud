from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.morningstar_dto import FinancialInsight, InsightQuery


class MorningstarUseCase(ABC):
    @abstractmethod
    async def generate_insight(self, query: InsightQuery) -> FinancialInsight:
        """실시간 시세 + 리서치 근거를 결합해 맞춤형 금융 인사이트를 생성한다."""
        pass
