"""인증 크로스커팅 의존성 — 모든 스포크가 공용으로 쓰는 JWT 검증 게이트."""

from __future__ import annotations

import os

import redis.asyncio as redis
from fastapi import Depends, HTTPException, Request, status

from core.rbac import Role
from core.security import TokenPayload, verify_token

_REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_SERVICE_AUD = os.getenv("SERVICE_AUD", "cloverky-api")


def _extract_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        return auth_header.split(" ", 1)[1].strip()
    return request.cookies.get("access_token")


async def _is_blacklisted(jti: str) -> bool:
    client: redis.Redis = redis.from_url(_REDIS_URL, decode_responses=True)
    try:
        return bool(await client.exists(f"auth:blacklist:{jti}"))
    finally:
        await client.aclose()


async def get_current_user(request: Request) -> TokenPayload:
    token = _extract_token(request)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="인증 토큰이 없습니다."
        )
    try:
        payload = verify_token(token, aud=_SERVICE_AUD)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다."
        ) from e

    if await _is_blacklisted(payload.jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="폐기된 토큰입니다."
        )
    return payload


class RoleChecker:
    def __init__(self, *allowed: Role) -> None:
        self._allowed = {role.value for role in allowed}

    def __call__(self, user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if not self._allowed.intersection(user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다."
            )
        return user
