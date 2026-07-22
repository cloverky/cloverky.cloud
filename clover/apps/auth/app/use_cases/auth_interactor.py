from __future__ import annotations

import os

from auth.app.dtos.auth_dto import (
    CallbackCommand,
    RefreshCommand,
    StartLoginResult,
    TokenPairDto,
)
from auth.app.ports.input.auth_use_case import AuthUseCase
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway
from auth.app.ports.output.oauth_state_repository import OAuthStateRepository
from auth.app.ports.output.refresh_token_repository import RefreshTokenRepository
from auth.app.ports.output.user_repository import UserRepository
from core.security import (
    create_access_token,
    create_refresh_token,
    peek_jti,
    verify_token,
)

_ACCESS_EXPIRES_MIN = 10
_REFRESH_EXPIRES_DAYS = 14
_REFRESH_AUD = "cloverky-auth"
_DEFAULT_SERVICE_AUD = "cloverky-api"


class AuthInteractor(AuthUseCase):
    def __init__(
        self,
        providers: dict[str, OAuthProviderGateway],
        users: UserRepository,
        tokens: RefreshTokenRepository,
        states: OAuthStateRepository,
        service_aud: str | None = None,
    ) -> None:
        self._providers = providers
        self._users = users
        self._tokens = tokens
        self._states = states
        self._service_aud: str = (
            service_aud or os.getenv("SERVICE_AUD") or _DEFAULT_SERVICE_AUD
        )

    def _provider(self, provider: str) -> OAuthProviderGateway:
        gateway = self._providers.get(provider)
        if gateway is None:
            raise ValueError(f"지원하지 않는 provider: {provider}")
        return gateway

    async def start_login(self, provider: str) -> StartLoginResult:
        state = await self._states.issue()
        authorize_url = self._provider(provider).build_authorize_url(state)
        return StartLoginResult(authorize_url=authorize_url, state=state)

    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        if not await self._states.consume(cmd.state):
            raise ValueError("유효하지 않거나 만료된 state 입니다.")

        identity = await self._provider(cmd.provider).exchange_code(cmd.code)
        user = await self._users.get_by_email(identity.email)
        if user is None:
            user = await self._users.create_oauth_user(identity.email, identity.name)

        return await self._issue_pair(sub=str(user.id), roles=[user.role])

    async def refresh(self, cmd: RefreshCommand) -> TokenPairDto:
        payload = verify_token(cmd.refresh_token, aud=_REFRESH_AUD)
        ok = await self._tokens.rotate_or_reject(sub=payload.sub, jti=payload.jti)
        if not ok:
            raise ValueError(
                "재사용된 리프레시 토큰입니다 — 모든 세션이 폐기되었습니다."
            )

        user = await self._users.get_by_id(int(payload.sub))
        if user is None:
            raise ValueError("사용자를 찾을 수 없습니다.")
        return await self._issue_pair(sub=payload.sub, roles=[user.role])

    async def logout(self, refresh_token: str, access_jti: str | None) -> None:
        try:
            payload = verify_token(refresh_token, aud=_REFRESH_AUD)
        except Exception:
            payload = None
        if payload is not None:
            await self._tokens.revoke_all_for_sub(payload.sub)
        if access_jti:
            await self._tokens.blacklist_access_token(
                access_jti, ttl_seconds=_ACCESS_EXPIRES_MIN * 60
            )

    async def _issue_pair(self, sub: str, roles: list[str]) -> TokenPairDto:
        access_token = create_access_token(
            sub=sub, roles=roles, aud=self._service_aud, expires_min=_ACCESS_EXPIRES_MIN
        )
        refresh_token = create_refresh_token(
            sub=sub, aud=_REFRESH_AUD, expires_days=_REFRESH_EXPIRES_DAYS
        )
        await self._tokens.store(
            sub=sub, jti=peek_jti(refresh_token), expires_days=_REFRESH_EXPIRES_DAYS
        )
        return TokenPairDto(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=_ACCESS_EXPIRES_MIN * 60,
        )
