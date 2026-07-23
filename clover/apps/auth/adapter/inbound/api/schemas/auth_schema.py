from __future__ import annotations

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    provider: str = Field(default="google", description="OAuth provider 식별자")


class LoginResponse(BaseModel):
    authorize_url: str
    state: str


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
