from __future__ import annotations

from dataclasses import dataclass


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
