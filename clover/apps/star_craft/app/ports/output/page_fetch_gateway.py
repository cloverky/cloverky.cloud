from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.web_page_dto import FetchedPage


class PageFetchPort(ABC):
    @abstractmethod
    async def fetch(self, url: str) -> FetchedPage:
        """URL 한 건을 가져와 FetchedPage로 반환한다 (실패도 예외 없이 ok=False로)."""
        pass
