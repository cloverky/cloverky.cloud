from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.morningstar_dto import MarketQuote


class MarketDataPort(ABC):
    @abstractmethod
    async def quotes(self, tickers: list[str]) -> list[MarketQuote]:
        """티커별 실시간 시세를 조회한다. 조회 실패한 티커는 결과에서 제외한다."""
        pass
