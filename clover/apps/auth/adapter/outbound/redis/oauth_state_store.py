from __future__ import annotations

import os
import secrets
from typing import cast

import redis.asyncio as redis

from auth.app.dtos.auth_dto import AuthMode
from auth.app.ports.output.oauth_state_repository import OAuthStateRepository

_TTL_SECONDS = 300
_DEFAULT_REDIS_URL = "redis://redis:6379/0"


class RedisOAuthStateStore(OAuthStateRepository):
    def __init__(self, redis_url: str | None = None) -> None:
        # 모듈 로드 시점 상수가 아니라 생성 시점에 읽는다 — 상수로 두면 테스트에서 바꿀 수 없다.
        self._redis_url: str = (
            redis_url or os.environ.get("REDIS_URL") or _DEFAULT_REDIS_URL
        )

    async def issue(self, mode: AuthMode) -> str:
        state = secrets.token_urlsafe(24)
        client: redis.Redis = redis.from_url(self._redis_url, decode_responses=True)
        try:
            await client.set(f"auth:state:{state}", mode, ex=_TTL_SECONDS)
        finally:
            await client.aclose()
        return state

    async def consume(self, state: str) -> AuthMode | None:
        client: redis.Redis = redis.from_url(self._redis_url, decode_responses=True)
        try:
            # GETDEL은 원자적이다. GET + DELETE로 나누면 동시에 도착한 두 콜백이
            # 같은 state로 모두 통과할 수 있다.
            value = await client.getdel(f"auth:state:{state}")
        finally:
            await client.aclose()
        if value in ("login", "signup"):
            return cast(AuthMode, value)
        return None
