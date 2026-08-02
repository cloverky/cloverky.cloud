"""완료 기준: 리프레시 재사용 시 해당 사용자의 세션이 전부 폐기되는지."""

from __future__ import annotations

import pytest

from auth.app.dtos.auth_dto import (
    AuthMode,
    AuthUserDto,
    CallbackCommand,
    EmailAlreadyRegisteredError,
    NotRegisteredError,
    OAuthLinkDto,
    PasswordLoginCommand,
    ProviderIdentity,
    RefreshCommand,
)
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway
from auth.app.ports.output.oauth_state_repository import OAuthStateRepository
from auth.app.ports.output.refresh_token_repository import RefreshTokenRepository
from auth.app.ports.output.user_repository import UserRepository
from auth.app.use_cases.auth_interactor import AuthInteractor
from secom.app.utils.auth_password import hash_password


class FakeGoogleGateway(OAuthProviderGateway):
    def build_authorize_url(self, state: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}"

    async def exchange_code(self, code: str) -> ProviderIdentity:
        return ProviderIdentity(
            provider_sub="g-1", email="tester@example.com", name="Tester"
        )


class FakeStateStore(OAuthStateRepository):
    def __init__(self) -> None:
        self.issued: dict[str, AuthMode] = {}
        self._count = 0

    async def issue(self, mode: AuthMode) -> str:
        state = f"state-{self._count}"
        self._count += 1
        self.issued[state] = mode
        return state

    async def consume(self, state: str) -> AuthMode | None:
        return self.issued.pop(state, None)


class FakeUserRepository(UserRepository):
    def __init__(self) -> None:
        self.rows: dict[int, AuthUserDto] = {}
        self.password_hashes: dict[str, str] = {}
        self.links: list[OAuthLinkDto] = []
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

    async def get_password_hash(self, email: str) -> str | None:
        return self.password_hashes.get(email)

    def add_password_user(self, email: str, name: str, password_hash: str) -> AuthUserDto:
        user = AuthUserDto(
            id=self._next_id, email=email, name=name, role="user", username=name
        )
        self.rows[user.id] = user
        self.password_hashes[email] = password_hash
        self._next_id += 1
        return user

    async def find_link(self, provider: str, provider_sub: str) -> OAuthLinkDto | None:
        return next(
            (
                link
                for link in self.links
                if link.provider == provider and link.provider_sub == provider_sub
            ),
            None,
        )

    async def claim_backfilled_link(
        self, provider: str, email: str, provider_sub: str
    ) -> OAuthLinkDto | None:
        user = await self.get_by_email(email)
        if user is None:
            return None
        for i, link in enumerate(self.links):
            if (
                link.provider == provider
                and link.provider_sub is None
                and link.user_id == user.id
            ):
                claimed = OAuthLinkDto(
                    user_id=link.user_id, provider=provider, provider_sub=provider_sub
                )
                self.links[i] = claimed
                return claimed
        return None

    async def create_link(
        self, user_id: int, provider: str, provider_sub: str
    ) -> OAuthLinkDto:
        link = OAuthLinkDto(
            user_id=user_id, provider=provider, provider_sub=provider_sub
        )
        self.links.append(link)
        return link

    def add_backfilled_link(self, user_id: int, provider: str) -> None:
        """마이그레이션 백필과 같은 상태 — provider_sub가 아직 비어 있는 연동 기록."""
        self.links.append(
            OAuthLinkDto(user_id=user_id, provider=provider, provider_sub=None)
        )


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


async def test_password_login_issues_pair(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    users.add_password_user(
        "aa@example.com", "aa", hash_password("supersecret1")
    )

    pair = await auth.login_with_password(
        PasswordLoginCommand(email="aa@example.com", password="supersecret1")
    )

    assert pair.access_token and pair.refresh_token
    assert pair.email == "aa@example.com"
    assert pair.username == "aa"
    assert len(tokens.live) == 1


async def test_password_login_rejects_wrong_password(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, _ = interactor
    users.add_password_user("aa@example.com", "aa", hash_password("supersecret1"))

    with pytest.raises(ValueError):
        await auth.login_with_password(
            PasswordLoginCommand(email="aa@example.com", password="wrongpassword")
        )


async def test_password_login_rejects_oauth_only_account(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """OAuth 전용 계정(해시가 빈 문자열)은 비밀번호 로그인이 불가하다."""
    auth, users, _ = interactor
    users.add_password_user("oauth@example.com", "oauthuser", "")

    with pytest.raises(ValueError):
        await auth.login_with_password(
            PasswordLoginCommand(email="oauth@example.com", password="anything")
        )


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


async def test_login_rejects_unlinked_social_account(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """가입한 적 없는 소셜 계정은 로그인할 수 없다 — 계정도 만들어지지 않는다."""
    auth, users, _ = interactor
    start = await auth.start_login("google")

    with pytest.raises(NotRegisteredError) as exc:
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )

    assert exc.value.provider == "google"
    assert exc.value.email == "tester@example.com"
    assert exc.value.name == "Tester"
    assert users.rows == {}


async def test_login_rejects_account_linked_to_another_provider(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """카카오로 가입한 계정은 같은 이메일이어도 구글로 로그인할 수 없다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "kakao", "k-1")
    start = await auth.start_login("google")

    with pytest.raises(NotRegisteredError):
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )


async def test_login_accepts_linked_account(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "google", "g-1")
    start = await auth.start_login("google")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.access_token and pair.refresh_token
    assert pair.email == "tester@example.com"
    assert pair.is_new_user is False
    assert len(tokens.live) == 1


async def test_login_claims_backfilled_link_and_fills_sub(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """마이그레이션으로 백필된 계정은 첫 로그인에서 통과하고 provider_sub가 채워진다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    users.add_backfilled_link(user.id, "google")
    start = await auth.start_login("google")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is False
    assert users.links == [
        OAuthLinkDto(user_id=user.id, provider="google", provider_sub="g-1")
    ]


async def test_signup_creates_user_and_link(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, users, tokens = interactor
    start = await auth.start_login("google", mode="signup")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is True
    assert pair.email == "tester@example.com"
    assert len(users.rows) == 1
    assert users.links == [
        OAuthLinkDto(user_id=1, provider="google", provider_sub="g-1")
    ]
    assert len(tokens.live) == 1


async def test_signup_rejects_email_registered_by_another_method(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """비밀번호로 이미 가입한 이메일은 소셜 가입으로 가로챌 수 없다."""
    auth, users, _ = interactor
    users.add_password_user(
        "tester@example.com", "tester", hash_password("supersecret1")
    )
    start = await auth.start_login("google", mode="signup")

    with pytest.raises(EmailAlreadyRegisteredError) as exc:
        await auth.handle_callback(
            CallbackCommand(provider="google", code="c", state=start.state)
        )

    assert exc.value.email == "tester@example.com"
    assert users.links == []


async def test_signup_on_already_linked_account_just_logs_in(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    """이미 가입된 사람이 가입 버튼을 눌러도 계정이 늘어나지 않는다."""
    auth, users, _ = interactor
    user = await users.create_oauth_user("tester@example.com", "Tester")
    await users.create_link(user.id, "google", "g-1")
    start = await auth.start_login("google", mode="signup")

    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    assert pair.is_new_user is False
    assert len(users.rows) == 1
    assert len(users.links) == 1


async def test_refresh_rotates_token(
    rsa_keys: tuple[str, str],
    interactor: tuple[AuthInteractor, FakeUserRepository, FakeRefreshStore],
) -> None:
    auth, _, tokens = interactor
    # 소셜 콜백은 더 이상 계정을 만들지 않는다 — 세션을 얻으려면 가입 모드로 시작한다.
    start = await auth.start_login("google", mode="signup")
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
    # 소셜 콜백은 더 이상 계정을 만들지 않는다 — 세션을 얻으려면 가입 모드로 시작한다.
    start = await auth.start_login("google", mode="signup")
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
    # 소셜 콜백은 더 이상 계정을 만들지 않는다 — 세션을 얻으려면 가입 모드로 시작한다.
    start = await auth.start_login("google", mode="signup")
    pair = await auth.handle_callback(
        CallbackCommand(provider="google", code="c", state=start.state)
    )

    await auth.logout(refresh_token=pair.refresh_token, access_jti="access-jti")

    assert tokens.live == set()
    assert "access-jti" in tokens.blacklisted
