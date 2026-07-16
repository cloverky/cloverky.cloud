from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import UTC, datetime

from star_craft.app.constants.paths import SCRAPED_DIR
from star_craft.app.dtos.scraper_dto import ScrapedRecord, ScrapeResultDto
from star_craft.app.ports.input.scraper_use_case import ScraperUseCase
from star_craft.app.ports.output.jsonl_sink_gateway import JsonlSinkPort
from star_craft.app.ports.output.page_fetch_gateway import PageFetchPort
from star_craft.app.ports.output.scrape_source_gateway import ScrapeSourcePort
from star_craft.domain.value_objects.html_text import extract_text, find_snippets

logger = logging.getLogger(__name__)


class ScraperInteractor(ScraperUseCase):
    """Redis 웹사이트·키워드 → 페이지에서 키워드 문맥 추출 → jsonl 적재 (독립 파이프라인)."""

    def __init__(
        self,
        source: ScrapeSourcePort,
        fetcher: PageFetchPort,
        sink: JsonlSinkPort,
    ) -> None:
        self._source = source
        self._fetcher = fetcher
        self._sink = sink

    async def scrape(self) -> ScrapeResultDto:
        websites = await self._source.list_websites()
        keywords = await self._source.list_keywords()
        now = datetime.now(UTC).isoformat()

        records: list[ScrapedRecord] = []
        pages = 0
        for url in websites:
            fetched = await self._fetcher.fetch(url)
            if not fetched.ok:
                continue
            pages += 1
            text = extract_text(fetched.html)
            for keyword in keywords:
                for snippet in find_snippets(text, keyword):
                    records.append(
                        ScrapedRecord(
                            url=fetched.url,
                            keyword=keyword,
                            snippet=snippet,
                            fetched_at=now,
                        )
                    )

        output_path = self._sink.write(SCRAPED_DIR, [asdict(r) for r in records])
        logger.info(
            "[star_craft] 스크래핑 완료 | pages=%d matches=%d -> %s",
            pages,
            len(records),
            output_path,
        )
        return ScrapeResultDto(
            pages=pages,
            matches=len(records),
            output_path=output_path,
        )
