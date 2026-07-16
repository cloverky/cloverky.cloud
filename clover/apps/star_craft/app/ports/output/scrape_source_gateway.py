from __future__ import annotations

from abc import ABC, abstractmethod


class ScrapeSourcePort(ABC):
    @abstractmethod
    async def list_websites(self) -> list[str]:
        """스크래핑 대상 웹사이트 URL 목록을 반환한다."""
        pass

    @abstractmethod
    async def list_keywords(self) -> list[str]:
        """스크래핑에 사용할 키워드 목록을 반환한다."""
        pass
