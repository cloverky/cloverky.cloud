from __future__ import annotations

import os
import secrets

import redis.asyncio as redis

from auth.app.ports.output.oauth_state_repository import OAuthStateRepository

_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_TTL_SECONDS = 300


class RedisOAuthStateStore(OAuthStateRepository):
    async def issue(self) -> str:
        state = secrets.token_urlsafe(24)
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            await client.set(f"auth:state:{state}", "1", ex=_TTL_SECONDS)
        finally:
            await client.aclose()
        return state

    async def consume(self, state: str) -> bool:
        client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
        try:
            deleted = await client.delete(f"auth:state:{state}")
        finally:
            await client.aclose()
        return bool(deleted)
