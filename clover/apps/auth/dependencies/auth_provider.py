from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from auth.adapter.outbound.google.google_oauth_gateway import GoogleOAuthGateway
from auth.adapter.outbound.naver.naver_oauth_gateway import NaverOAuthGateway
from auth.adapter.outbound.redis.oauth_state_store import RedisOAuthStateStore
from auth.adapter.outbound.redis.refresh_token_store import RedisRefreshTokenStore
from auth.adapter.outbound.repositories.user_pg_repository import UserPgRepository
from auth.app.ports.input.auth_use_case import AuthUseCase
from auth.app.use_cases.auth_interactor import AuthInteractor
from core.database import get_db


def get_auth_use_case(db: AsyncSession = Depends(get_db)) -> AuthUseCase:
    return AuthInteractor(
        providers={"google": GoogleOAuthGateway(), "naver": NaverOAuthGateway()},
        users=UserPgRepository(session=db),
        tokens=RedisRefreshTokenStore(),
        states=RedisOAuthStateStore(),
    )
