from __future__ import annotations

from abc import ABC, abstractmethod

from auth.app.dtos.auth_dto import ProviderIdentity


class OAuthProviderGateway(ABC):
    @abstractmethod
    def build_authorize_url(self, state: str) -> str:
        pass

    @abstractmethod
    async def exchange_code(self, code: str) -> ProviderIdentity:
        pass
