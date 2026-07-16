from __future__ import annotations

import os

import redis.asyncio as redis
from star_craft.app.ports.output.scrape_source_gateway import ScrapeSourcePort

# compose 서비스명 redis. 필요 시 env로 오버라이드.
_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
# 스크래핑 대상 URL 목록 (Redis LIST) / 키워드 목록 (Redis SET).
_WEBSITES_KEY = os.getenv("SCRAPER_WEBSITES_KEY", "scraper:websites")
_KEYWORDS_KEY = os.getenv("SCRAPER_KEYWORDS_KEY", "scraper:keywords")


class RedisScrapeSourceGateway(ScrapeSourcePort):
    """Redis에서 스크래핑 대상 URL(LIST)과 키워드(SET)를 읽는 어댑터."""

    def __init__(
        self,
        url: str = _REDIS_URL,
        websites_key: str = _WEBSITES_KEY,
        keywords_key: str = _KEYWORDS_KEY,
    ) -> None:
        self._url = url
        self._websites_key = websites_key
        self._keywords_key = keywords_key

    async def list_websites(self) -> list[str]:
        client: redis.Redis = redis.from_url(self._url, decode_responses=True)
        try:
            # decode_responses=True 이므로 원소는 str (mypy 힌트용 str() 래핑)
            return [str(x) for x in await client.lrange(self._websites_key, 0, -1)]
        finally:
            await client.aclose()

    async def list_keywords(self) -> list[str]:
        client: redis.Redis = redis.from_url(self._url, decode_responses=True)
        try:
            return sorted(str(x) for x in await client.smembers(self._keywords_key))
        finally:
            await client.aclose()
