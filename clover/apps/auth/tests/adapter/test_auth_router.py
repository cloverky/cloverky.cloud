"""GET /auth/login/{provider} — 브라우저 진입점이 동의 화면으로 리다이렉트하는지."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.adapter.inbound.api.auth_router import auth_router
from auth.app.dtos.auth_dto import (
    AuthMode,
    CallbackCommand,
    PasswordLoginCommand,
    RefreshCommand,
    StartLoginResult,
    TokenPairDto,
)
from auth.app.ports.input.auth_use_case import AuthUseCase
from auth.dependencies.auth_provider import get_auth_use_case

_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth?state=state-0"


class StubAuthUseCase(AuthUseCase):
    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        if provider != "google":
            raise ValueError(f"지원하지 않는 provider: {provider}")
        return StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")

    async def login_with_password(self, cmd: PasswordLoginCommand) -> TokenPairDto:
        raise NotImplementedError

    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        raise NotImplementedError

    async def refresh(self, cmd: RefreshCommand) -> TokenPairDto:
        raise NotImplementedError

    async def logout(self, refresh_token: str, access_jti: str | None) -> None:
        raise NotImplementedError


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth")
    app.dependency_overrides[get_auth_use_case] = StubAuthUseCase
    return TestClient(app)


def test_login_redirect_sends_browser_to_provider(client: TestClient) -> None:
    res = client.get("/auth/login/google", follow_redirects=False)

    assert res.status_code == 302
    assert res.headers["location"] == _AUTHORIZE_URL


def test_login_redirect_rejects_unknown_provider(client: TestClient) -> None:
    res = client.get("/auth/login/kakao", follow_redirects=False)

    assert res.status_code == 400
    assert "provider" in res.json()["detail"]


def test_post_login_still_returns_json(client: TestClient) -> None:
    """기존 POST /auth/login 계약이 깨지지 않아야 한다."""
    res = client.post("/auth/login", json={"provider": "google"})

    assert res.status_code == 200
    assert res.json() == {"authorize_url": _AUTHORIZE_URL, "state": "state-0"}


class _CallbackStub(AuthUseCase):
    """콜백 리다이렉트 계약(기존 lucky 프론트 소셜 로그인 팝업과의 호환) 검증용."""

    def __init__(self, pair: TokenPairDto) -> None:
        self._pair = pair

    async def start_login(
        self, provider: str, mode: AuthMode = "login"
    ) -> StartLoginResult:
        return StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")

    async def login_with_password(self, cmd: PasswordLoginCommand) -> TokenPairDto:
        return self._pair

    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        return self._pair

    async def refresh(self, cmd: RefreshCommand) -> TokenPairDto:
        raise NotImplementedError

    async def logout(self, refresh_token: str, access_jti: str | None) -> None:
        raise NotImplementedError


def _client_for(pair: TokenPairDto) -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/auth")
    app.dependency_overrides[get_auth_use_case] = lambda: _CallbackStub(pair)
    return TestClient(app)


def test_callback_redirects_new_user_to_consent_page() -> None:
    pair = TokenPairDto(
        access_token="at",
        refresh_token="rt",
        token_type="bearer",
        expires_in=600,
        name="네이버 사용자",
        email="naver_1@naver.local",
        is_new_user=True,
    )
    res = _client_for(pair).get(
        "/auth/callback/naver?code=c&state=s", follow_redirects=False
    )

    assert res.status_code == 303
    location = res.headers["location"]
    assert location.startswith("https://cloverky.cloud/signup/consent?")
    assert "token=at" in location
    assert "email=naver_1%40naver.local" in location


def test_callback_redirects_returning_user_to_oauth_callback() -> None:
    pair = TokenPairDto(
        access_token="at",
        refresh_token="rt",
        token_type="bearer",
        expires_in=600,
        name="Tester",
        email="tester@example.com",
        is_new_user=False,
    )
    res = _client_for(pair).get(
        "/auth/callback/google?code=c&state=s", follow_redirects=False
    )

    assert res.status_code == 303
    assert res.headers["location"].startswith("https://cloverky.cloud/oauth/callback?")
