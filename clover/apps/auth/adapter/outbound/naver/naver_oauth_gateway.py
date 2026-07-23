from __future__ import annotations

import os

import httpx

from auth.app.dtos.auth_dto import ProviderIdentity
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway

_AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize"
_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
_USERINFO_URL = "https://openapi.naver.com/v1/nid/me"


class NaverOAuthGateway(OAuthProviderGateway):
    def __init__(self) -> None:
        self._client_id = os.getenv("NAVER_CLIENT_ID", "")
        self._client_secret = os.getenv("NAVER_CLIENT_SECRET", "")
        self._redirect_uri = os.getenv("NAVER_REDIRECT_URI", "")

    def build_authorize_url(self, state: str) -> str:
        params = httpx.QueryParams(
            {
                "response_type": "code",
                "client_id": self._client_id,
                "redirect_uri": self._redirect_uri,
                "state": state,
            }
        )
        return f"{_AUTHORIZE_URL}?{params}"

    async def exchange_code(self, code: str) -> ProviderIdentity:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                _TOKEN_URL,
                params={
                    "grant_type": "authorization_code",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "code": code,
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]

            userinfo_res = await client.get(
                _USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_res.raise_for_status()
            info = userinfo_res.json()["response"]

        provider_sub = str(info["id"])
        return ProviderIdentity(
            provider_sub=provider_sub,
            email=str(info.get("email") or f"naver_{provider_sub}@naver.local"),
            name=str(info.get("name", "네이버 사용자")),
        )
