from __future__ import annotations

import os

import httpx

from auth.app.dtos.auth_dto import ProviderIdentity
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway

_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"
_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
_USERINFO_URL = "https://kapi.kakao.com/v2/user/me"


class KakaoOAuthGateway(OAuthProviderGateway):
    def __init__(self) -> None:
        self._client_id = os.getenv("KAKAO_CLIENT_ID", "")
        # 카카오는 기본적으로 client_secret이 필요 없다 — 개발자센터에서
        # "Client Secret 사용"을 켠 경우에만 필요하므로 선택값으로 둔다.
        self._client_secret = os.getenv("KAKAO_CLIENT_SECRET", "")
        self._redirect_uri = os.getenv("KAKAO_REDIRECT_URI", "")

    def build_authorize_url(self, state: str) -> str:
        params = httpx.QueryParams(
            {
                "client_id": self._client_id,
                "redirect_uri": self._redirect_uri,
                "response_type": "code",
                "state": state,
            }
        )
        return f"{_AUTHORIZE_URL}?{params}"

    async def exchange_code(self, code: str) -> ProviderIdentity:
        data = {
            "grant_type": "authorization_code",
            "client_id": self._client_id,
            "redirect_uri": self._redirect_uri,
            "code": code,
        }
        if self._client_secret:
            data["client_secret"] = self._client_secret

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(_TOKEN_URL, data=data)
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]

            userinfo_res = await client.get(
                _USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_res.raise_for_status()
            info = userinfo_res.json()

        kakao_account = info.get("kakao_account", {})
        provider_sub = str(info["id"])
        return ProviderIdentity(
            provider_sub=provider_sub,
            email=str(
                kakao_account.get("email") or f"kakao_{provider_sub}@kakao.local"
            ),
            name=str(kakao_account.get("profile", {}).get("nickname", "카카오 사용자")),
        )
