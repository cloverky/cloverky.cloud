"""JWT를 Redis에 저장/조회/삭제하는 어댑터."""
from __future__ import annotations

import os

import redis.asyncio as redis

_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_TTL_SECONDS = int(os.getenv("JWT_REDIS_TTL", str(60 * 60 * 24 * 7)))  # 7일


class TokenStore:
    def __init__(self, url: str = _REDIS_URL) -> None:
        self._client: redis.Redis = redis.from_url(url, decode_responses=True)

    async def save(self, jti: str, user_id: str, ttl: int = _TTL_SECONDS) -> None:
        await self._client.setex(f"jwt:{jti}", ttl, user_id)

    async def exists(self, jti: str) -> bool:
        return bool(await self._client.exists(f"jwt:{jti}"))

    async def delete(self, jti: str) -> None:
        await self._client.delete(f"jwt:{jti}")

    async def aclose(self) -> None:
        await self._client.aclose()


_store: TokenStore | None = None


def get_token_store() -> TokenStore:
    global _store
    if _store is None:
        _store = TokenStore()
    return _store
