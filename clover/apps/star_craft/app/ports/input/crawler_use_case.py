from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.crawler_dto import CrawlResultDto


class CrawlerUseCase(ABC):
    @abstractmethod
    async def crawl(self) -> CrawlResultDto:
        """Redis의 웹사이트 목록을 읽어 각 페이지를 수집하고 jsonl로 적재한다."""
        pass
