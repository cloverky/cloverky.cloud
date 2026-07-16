from __future__ import annotations

import os

import redis.asyncio as redis
from star_craft.app.ports.output.crawl_source_gateway import CrawlSourcePort

# compose 서비스명 redis. 필요 시 env로 오버라이드.
_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
# 크롤 대상 웹사이트 URL 목록 (Redis LIST). 예: RPUSH crawler:websites "https://..."
_WEBSITES_KEY = os.getenv("CRAWLER_WEBSITES_KEY", "crawler:websites")


class RedisCrawlSourceGateway(CrawlSourcePort):
    """Redis LIST에서 크롤 대상 URL 목록을 읽는 어댑터."""

    def __init__(
        self, url: str = _REDIS_URL, websites_key: str = _WEBSITES_KEY
    ) -> None:
        self._url = url
        self._websites_key = websites_key

    async def list_websites(self) -> list[str]:
        client: redis.Redis = redis.from_url(self._url, decode_responses=True)
        try:
            # decode_responses=True 이므로 원소는 str (mypy 힌트용 str() 래핑)
            return [str(x) for x in await client.lrange(self._websites_key, 0, -1)]
        finally:
            await client.aclose()
