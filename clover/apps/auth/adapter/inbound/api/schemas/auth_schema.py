from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    provider: str = Field(default="google", description="OAuth provider 식별자")


class LoginResponse(BaseModel):
    authorize_url: str
    state: str


class PasswordLoginRequest(BaseModel):
    email: str
    password: str


class PasswordLoginResponse(BaseModel):
    """토큰은 httponly 쿠키로만 내려간다 — 본문에는 표시용 사용자 정보만 담는다."""

    message: str
    name: str
    username: str
    email: str
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str | None = Field(
        default=None,
        description="미지정 시 refresh_token 쿠키에서 읽는다.",
    )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


class LogoutResponse(BaseModel):
    message: str
