from __future__ import annotations

from abc import ABC, abstractmethod


class RefreshTokenRepository(ABC):
    """리프레시 토큰 로테이션(totem) + 즉시 차단 블랙리스트 포트."""

    @abstractmethod
    async def store(self, sub: str, jti: str, expires_days: int) -> None:
        pass

    @abstractmethod
    async def rotate_or_reject(self, sub: str, jti: str) -> bool:
        """jti가 유효하면 소진하고 True. 이미 사용된(재사용) jti면 해당 sub의
        모든 세션을 폐기하고 False를 반환한다."""

    @abstractmethod
    async def revoke_all_for_sub(self, sub: str) -> None:
        pass

    @abstractmethod
    async def blacklist_access_token(self, jti: str, ttl_seconds: int) -> None:
        pass
