from __future__ import annotations

from abc import ABC, abstractmethod

from auth.app.dtos.auth_dto import AuthUserDto


class UserRepository(ABC):
    @abstractmethod
    async def get_by_email(self, email: str) -> AuthUserDto | None:
        pass

    @abstractmethod
    async def get_by_id(self, user_id: int) -> AuthUserDto | None:
        pass

    @abstractmethod
    async def create_oauth_user(self, email: str, name: str) -> AuthUserDto:
        pass
