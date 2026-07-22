"""GET /auth/login/{provider} — 브라우저 진입점이 동의 화면으로 리다이렉트하는지."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.adapter.inbound.api.auth_router import auth_router
from auth.app.dtos.auth_dto import (
    CallbackCommand,
    RefreshCommand,
    StartLoginResult,
    TokenPairDto,
)
from auth.app.ports.input.auth_use_case import AuthUseCase
from auth.dependencies.auth_provider import get_auth_use_case

_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth?state=state-0"


class StubAuthUseCase(AuthUseCase):
    async def start_login(self, provider: str) -> StartLoginResult:
        if provider != "google":
            raise ValueError(f"지원하지 않는 provider: {provider}")
        return StartLoginResult(authorize_url=_AUTHORIZE_URL, state="state-0")

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
