from __future__ import annotations

from abc import ABC, abstractmethod


class OAuthStateRepository(ABC):
    """OAuth CSRF state 발급/검증 포트."""

    @abstractmethod
    async def issue(self) -> str:
        pass

    @abstractmethod
    async def consume(self, state: str) -> bool:
        pass
