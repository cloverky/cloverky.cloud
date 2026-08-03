from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

AuthMode = Literal["login", "signup"]


@dataclass(frozen=True)
class ProviderIdentity:
    provider_sub: str
    email: str
    name: str


@dataclass(frozen=True)
class AuthUserDto:
    id: int
    email: str
    name: str
    role: str
    username: str = ""


@dataclass(frozen=True)
class StartLoginResult:
    authorize_url: str
    state: str


@dataclass(frozen=True)
class CallbackCommand:
    provider: str
    code: str
    state: str


@dataclass(frozen=True)
class RefreshCommand:
    refresh_token: str


@dataclass(frozen=True)
class PasswordLoginCommand:
    email: str
    password: str


@dataclass(frozen=True)
class TokenPairDto:
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int
    name: str
    email: str
    is_new_user: bool = False
    username: str = ""
    role: str = "user"


@dataclass(frozen=True)
class OAuthLinkDto:
    """어떤 유저가 어떤 provider로 가입했는지. 이 기록이 있어야 그 provider로 로그인할 수 있다."""

    user_id: int
    provider: str
    provider_sub: str | None


class NotRegisteredError(Exception):
    """그 provider로 가입한 적 없는 소셜 계정이 로그인을 시도했다.

    ValueError를 상속하지 않는다 — 라우터가 ValueError를 400으로 바꾸고 있어
    상속하면 에러 리다이렉트로 분기할 수 없다.
    """

    def __init__(self, provider: str, email: str, name: str) -> None:
        super().__init__("등록되지 않은 계정입니다.")
        self.provider = provider
        self.email = email
        self.name = name


class EmailAlreadyRegisteredError(Exception):
    """소셜 가입을 시도했지만 그 이메일이 이미 다른 방법으로 가입돼 있다."""

    def __init__(self, provider: str, email: str) -> None:
        super().__init__("이미 가입된 이메일입니다.")
        self.provider = provider
        self.email = email
