from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from auth.adapter.inbound.api.schemas.auth_schema import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshRequest,
    TokenResponse,
)
from auth.app.dtos.auth_dto import CallbackCommand, RefreshCommand, TokenPairDto
from auth.app.ports.input.auth_use_case import AuthUseCase
from auth.app.use_cases._jwks import build_jwks
from auth.dependencies.auth_provider import get_auth_use_case
from core.security import COOKIE_KWARGS, peek_jti, public_key_pem

auth_router = APIRouter(tags=["auth"])

_FRONTEND_URL = os.getenv("FRONTEND_URL", "https://cloverky.cloud")
_JWT_KID = os.getenv("JWT_KID", "cloverky-1")


def _build_frontend_redirect(pair: TokenPairDto) -> str:
    """기존 소셜 로그인 팝업(social-login-buttons.tsx)이 기대하는 콜백 계약과 동일하게
    맞춘다 — 신규 가입자는 약관 동의 화면으로, 기존 사용자는 콜백 처리 페이지로."""
    path = "/signup/consent" if pair.is_new_user else "/oauth/callback"
    query = (
        f"?token={quote(pair.access_token)}"
        f"&name={quote(pair.name)}"
        f"&email={quote(pair.email)}"
    )
    return f"{_FRONTEND_URL}{path}{query}"


def _set_token_cookies(response: Response, pair: TokenPairDto) -> None:
    response.set_cookie("access_token", pair.access_token, **COOKIE_KWARGS)
    response.set_cookie("refresh_token", pair.refresh_token, **COOKIE_KWARGS)


def _to_token_response(pair: TokenPairDto) -> TokenResponse:
    return TokenResponse(
        access_token=pair.access_token,
        refresh_token=pair.refresh_token,
        token_type=pair.token_type,
        expires_in=pair.expires_in,
    )


@auth_router.post("/login", response_model=LoginResponse)
async def login(
    req: LoginRequest,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> LoginResponse:
    """OAuth 로그인 시작 — provider의 authorize URL과 CSRF state를 반환한다."""
    try:
        result = await auth.start_login(req.provider)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    return LoginResponse(authorize_url=result.authorize_url, state=result.state)


@auth_router.get("/login/{provider}", response_model=None)
async def login_redirect(
    provider: str,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> RedirectResponse:
    """브라우저에서 바로 열 수 있는 로그인 진입점 — provider 동의 화면으로 302."""
    try:
        result = await auth.start_login(provider)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    return RedirectResponse(url=result.authorize_url, status_code=302)


@auth_router.get("/callback/{provider}", response_model=None)
async def callback(
    provider: str,
    code: str,
    state: str,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> RedirectResponse:
    """OAuth 콜백 — 토큰을 쿠키로 심고 프론트엔드로 리다이렉트한다."""
    try:
        pair = await auth.handle_callback(
            CallbackCommand(provider=provider, code=code, state=state)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e

    response = RedirectResponse(url=_build_frontend_redirect(pair), status_code=303)
    _set_token_cookies(response, pair)
    return response


@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(
    req: RefreshRequest,
    request: Request,
    response: Response,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> TokenResponse:
    """리프레시 토큰 로테이션. 재사용이 감지되면 해당 사용자의 모든 세션이 폐기된다."""
    token = req.refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 없습니다.",
        )
    try:
        pair = await auth.refresh(RefreshCommand(refresh_token=token))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        ) from e

    _set_token_cookies(response, pair)
    return _to_token_response(pair)


@auth_router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: Request,
    response: Response,
    auth: AuthUseCase = Depends(get_auth_use_case),
) -> LogoutResponse:
    """모든 리프레시 세션 폐기 + 현재 access token 블랙리스트 등록."""
    refresh_token = request.cookies.get("refresh_token", "")
    access_jti = await _peek_access_jti(request)
    await auth.logout(refresh_token=refresh_token, access_jti=access_jti)

    response.delete_cookie("access_token", domain=COOKIE_KWARGS["domain"])
    response.delete_cookie("refresh_token", domain=COOKIE_KWARGS["domain"])
    return LogoutResponse(message="로그아웃되었습니다.")


@auth_router.get("/.well-known/jwks.json", response_model=None)
async def jwks() -> dict[str, Any]:
    """공개키를 JWK Set으로 노출 — 외부 검증자용."""
    return build_jwks(public_key_pem(), kid=_JWT_KID)


async def _peek_access_jti(request: Request) -> str | None:
    """만료된 access token이어도 블랙리스트에 넣을 수 있도록 서명 검증 없이 jti만 읽는다."""
    header = request.headers.get("Authorization", "")
    token = (
        header.split(" ", 1)[1].strip()
        if header.lower().startswith("bearer ")
        else request.cookies.get("access_token")
    )
    if not token:
        return None
    try:
        return peek_jti(token)
    except Exception:
        return None
