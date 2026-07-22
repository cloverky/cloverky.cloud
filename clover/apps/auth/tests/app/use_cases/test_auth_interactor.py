"""완료 기준: 리프레시 재사용 시 해당 사용자의 세션이 전부 폐기되는지."""

from __future__ import annotations

import pytest

from auth.app.dtos.auth_dto import (
    AuthUserDto,
    CallbackCommand,
    ProviderIdentity,
    RefreshCommand,
)
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway
from auth.app.ports.output.oauth_state_repository import OAuthStateRepository
from auth.app.ports.output.refresh_token_repository import RefreshTokenRepository
from auth.app.ports.output.user_repository import UserRepository
from auth.app.use_cases.auth_interactor import AuthInteractor


class FakeGoogleGateway(OAuthProviderGateway):
    def build_authorize_url(self, state: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}"

    async def exchange_code(self, code: str) -> ProviderIdentity:
        return ProviderIdentity(
            provider_sub="g-1", email="tester@example.com", name="Tester"
        )


class FakeStateStore(OAuthStateRepository):
    def __init__(self) -> None:
        self.issued: set[str] = set()

    async def issue(self) -> str:
        state = f"state-{len(self.issued)}"
        self.issued.add(state)
        return state

    async def consume(self, state: str) -> bool:
        if state not in self.issued:
            return False
        self.issued.remove(state)
        return True


class FakeUserRepository(UserRepository):
    def __init__(self) -> None:
        self.rows: dict[int, AuthUserDto] = {}
        self._next_id = 1

    async def get_by_email(self, email: str) -> AuthUserDto | None:
        return next((u for u in self.rows.values() if u.email == email), None)

    async def get_by_id(self, user_id: int) -> AuthUserDto | None:
        return self.rows.get(user_id)

    async def create_oauth_user(self, email: str, name: str) -> AuthUserDto:
        user = AuthUserDto(id=self._next_id, email=email, name=name, role="user")
        self.rows[user.id] = user
        self._next_id += 1
        return user


class FakeRefreshStore(RefreshTokenRepository):
    def __init__(self) -> None:
        self.live: set[tuple[str, str]] = set()
        self.blacklisted: set[str] = set()
        self.revoke_all_calls: list[str] = []

    async def store(self, sub: str, jti: str, expires_days: int) -> None:
        self.live.add((sub, jti))

    async def rotate_or_reject(self, sub: str, jti: str) -> bool:
        if (sub, jti) not in self.live:
            await self.revoke_all_for_sub(sub)
            return False
        self.live.discard((sub, jti))
        return True

    async def revoke_all_for_sub(self, sub: str) -> None:
        self.revoke_all_calls.append(sub)
        self.live = {pair for pair in self.live if pair[0] != sub}

    async def blacklist_access_token(self, jti: str, ttl_seconds: int) -> None:
        self.blacklisted.add(jti)


@pytest.fixture
def interactor() -> tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore]:
    users = FakeUserRepository()
    tokens = FakeRefreshStore()
    return (
        AuthInteractor(
            providers={"google": FakeGoogleGateway()},
            users=users,
            tokens=tokens,
            states=FakeStateStore(),
            service_aud="cloverky-api",
        ),
        users,
        tokens,
    )


async def test_callback_creates_user_and_issues_pair(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    start = await auth.start_login("google")
    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.access_token and pair.refresh_token
    assert pair.token_type == "bearer"
    assert len(users.rows) == 1
    assert len(tokens.live) == 1


async def test_callback_rejects_unknown_state(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, _ = interactor
    with pytest.raises(ValueError, match="state"):
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state="forged")
        )


async def test_callback_rejects_unknown_provider(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, _ = interactor
    with pytest.raises(ValueError, match="provider"):
        await auth.start_login("kakao")


async def test_refresh_rotates_token(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, tokens = interactor
    start = await auth.start_login("google")
    first = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    second = await auth.refresh(RefreshCommand(refresh_token=first.refresh_token))

    assert second.refresh_token != first.refresh_token
    assert len(tokens.live) == 1  # 이전 토큰은 소진됨


async def test_refresh_reuse_revokes_every_session(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, tokens = interactor
    start = await auth.start_login("google")
    first = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )
    await auth.refresh(RefreshCommand(refresh_token=first.refresh_token))

    # 이미 소진된 리프레시 토큰을 재사용 → 세션 전체 폐기
    with pytest.raises(ValueError, match="재사용"):
        await auth.refresh(RefreshCommand(refresh_token=first.refresh_token))

    assert tokens.revoke_all_calls == ["1"]
    assert tokens.live == set()


async def test_logout_revokes_sessions_and_blacklists_access_token(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, tokens = interactor
    start = await auth.start_login("google")
    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    await auth.logout(refresh_token=pair.refresh_token, access_jti="access-jti")

    assert tokens.live == set()
    assert "access-jti" in tokens.blacklisted
