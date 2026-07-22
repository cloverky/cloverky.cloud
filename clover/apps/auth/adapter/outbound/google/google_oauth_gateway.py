from __future__ import annotations

import os

import httpx

from auth.app.dtos.auth_dto import ProviderIdentity
from auth.app.ports.output.oauth_provider_gateway import OAuthProviderGateway

_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_URL = "https://oauth2.googleapis.com/token"
_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleOAuthGateway(OAuthProviderGateway):
    def __init__(self) -> None:
        self._client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self._client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self._redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "")

    def build_authorize_url(self, state: str) -> str:
        params = httpx.QueryParams(
            {
                "client_id": self._client_id,
                "redirect_uri": self._redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "access_type": "offline",
                "prompt": "consent",
            }
        )
        return f"{_AUTHORIZE_URL}?{params}"

    async def exchange_code(self, code: str) -> ProviderIdentity:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_res = await client.post(
                _TOKEN_URL,
                data={
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": self._redirect_uri,
                },
            )
            token_res.raise_for_status()
            access_token = token_res.json()["access_token"]

            userinfo_res = await client.get(
                _USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            userinfo_res.raise_for_status()
            info = userinfo_res.json()

        return ProviderIdentity(
            provider_sub=str(info["sub"]),
            email=str(info["email"]),
            name=str(info.get("name", info["email"])),
        )
