"""실시간 시세 어댑터 — Yahoo Finance 공개 chart 엔드포인트 (API 키 불필요)."""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import UTC, datetime
from typing import Any

import httpx
from admin.app.dtos.morningstar_dto import MarketQuote
from admin.app.ports.output.market_data_port import MarketDataPort

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv(
    "MARKET_DATA_BASE_URL", "https://query1.finance.yahoo.com/v8/finance/chart"
)
_TIMEOUT = float(os.getenv("MARKET_DATA_TIMEOUT_SECONDS", "10"))
# 봇 차단 회피가 아니라 기본 UA 거부를 피하기 위한 최소 헤더
_HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; clover-morningstar/1.0)"}


class YahooMarketDataGateway(MarketDataPort):
    def __init__(self, base_url: str = _BASE_URL, timeout: float = _TIMEOUT) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    async def quotes(self, tickers: list[str]) -> list[MarketQuote]:
        if not tickers:
            return []
        async with httpx.AsyncClient(timeout=self._timeout, headers=_HEADERS) as client:
            results = await asyncio.gather(
                *(self._quote(client, ticker) for ticker in tickers),
                return_exceptions=True,
            )

        quotes: list[MarketQuote] = []
        for ticker, result in zip(tickers, results, strict=True):
            if isinstance(result, MarketQuote):
                quotes.append(result)
            else:
                # 한 종목 실패가 인사이트 생성 전체를 막지 않는다.
                logger.warning("시세 조회 실패 — %s: %s", ticker, result)
        return quotes

    async def _quote(self, client: httpx.AsyncClient, ticker: str) -> MarketQuote:
        response = await client.get(
            f"{self._base_url}/{ticker}", params={"interval": "1d", "range": "1d"}
        )
        response.raise_for_status()
        meta: dict[str, Any] = response.json()["chart"]["result"][0]["meta"]

        price = float(meta["regularMarketPrice"])
        previous_close = float(
            meta.get("chartPreviousClose") or meta.get("previousClose") or price
        )
        change_percent = (
            (price - previous_close) / previous_close * 100 if previous_close else 0.0
        )
        return MarketQuote(
            ticker=str(meta.get("symbol", ticker)),
            price=price,
            currency=str(meta.get("currency", "")),
            previous_close=previous_close,
            change_percent=change_percent,
            as_of=datetime.fromtimestamp(int(meta["regularMarketTime"]), tz=UTC),
        )
