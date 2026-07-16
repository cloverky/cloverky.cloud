from __future__ import annotations

from abc import ABC, abstractmethod


class CrawlSourcePort(ABC):
    @abstractmethod
    async def list_websites(self) -> list[str]:
        """크롤 대상 웹사이트 URL 목록을 반환한다."""
        pass
