from __future__ import annotations

from abc import ABC, abstractmethod

from auth.app.dtos.auth_dto import AuthUserDto, OAuthLinkDto


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

    @abstractmethod
    async def find_link(self, provider: str, provider_sub: str) -> OAuthLinkDto | None:
        """provider_sub로 연동 기록을 찾는다.

        이메일이 아니라 provider_sub로 찾는다 — 이메일은 바뀔 수 있고, 카카오는
        이메일 제공이 선택이라 kakao_{id}@kakao.local 폴백이 쓰인다.
        """
        pass

    @abstractmethod
    async def claim_backfilled_link(
        self, provider: str, email: str, provider_sub: str
    ) -> OAuthLinkDto | None:
        """provider_sub가 비어 있는 백필 행을 이메일로 찾아 sub를 채우고 돌려준다.

        마이그레이션으로 넣은 기존 계정은 소셜측 고유 ID를 알 수 없다.
        계정당 첫 로그인 때 한 번만 성사된다.
        """
        pass

    @abstractmethod
    async def create_link(
        self, user_id: int, provider: str, provider_sub: str
    ) -> OAuthLinkDto:
        pass
