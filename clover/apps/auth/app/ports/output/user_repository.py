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

    @abstractmethod
    async def get_password_hash(self, email: str) -> str | None:
        """비밀번호 로그인 검증용 — 해시가 없는 OAuth 전용 계정은 빈 문자열을 돌려준다."""
        pass
