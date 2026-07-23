from __future__ import annotations

from abc import ABC, abstractmethod

from auth.app.dtos.auth_dto import (
    CallbackCommand,
    RefreshCommand,
    StartLoginResult,
    TokenPairDto,
)


class AuthUseCase(ABC):
    @abstractmethod
    async def start_login(self, provider: str) -> StartLoginResult:
        pass

    @abstractmethod
    async def handle_callback(self, cmd: CallbackCommand) -> TokenPairDto:
        pass

    @abstractmethod
    async def refresh(self, cmd: RefreshCommand) -> TokenPairDto:
        pass

    @abstractmethod
    async def logout(self, refresh_token: str, access_jti: str | None) -> None:
        pass
