from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.scraper_dto import ScrapeResultDto


class ScraperUseCase(ABC):
    @abstractmethod
    async def scrape(self) -> ScrapeResultDto:
        """Redis의 웹사이트·키워드를 읽어 키워드 매칭 문맥을 추출하고 jsonl로 적재한다."""
        pass
