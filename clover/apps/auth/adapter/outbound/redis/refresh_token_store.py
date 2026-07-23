from __future__ import annotations

import os

import redis.asyncio as redis

from auth.app.ports.output.refresh_token_repository import RefreshTokenRepository

_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")


class RedisRefreshTokenStore(RefreshTokenRepository):
    async def store(self, sub: str, jti: str, expires_days: int) -> None:
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            await client.set(f"auth:refresh:{sub}:{jti}", "1", ex=expires_days * 86400)
        finally:
            await client.aclose()

    async def rotate_or_reject(self, sub: str, jti: str) -> bool:
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            deleted = await client.delete(f"auth:refresh:{sub}:{jti}")
            if not deleted:
                await self._revoke_all(client, sub)
                return False
            return True
        finally:
            await client.aclose()

    async def revoke_all_for_sub(self, sub: str) -> None:
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            await self._revoke_all(client, sub)
        finally:
            await client.aclose()

    async def blacklist_access_token(self, jti: str, ttl_seconds: int) -> None:
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            await client.set(f"auth:blacklist:{jti}", "1", ex=ttl_seconds)
        finally:
            await client.aclose()

    @staticmethod
    async def _revoke_all(client: redis.Redis, sub: str) -> None:
        async for key in client.scan_iter(match=f"auth:refresh:{sub}:*"):
            await client.delete(key)
