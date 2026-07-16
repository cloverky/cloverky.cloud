from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import UTC, datetime

from star_craft.app.constants.paths import CRAWLED_DIR
from star_craft.app.dtos.crawler_dto import CrawledPage, CrawlResultDto
from star_craft.app.ports.input.crawler_use_case import CrawlerUseCase
from star_craft.app.ports.output.crawl_source_gateway import CrawlSourcePort
from star_craft.app.ports.output.jsonl_sink_gateway import JsonlSinkPort
from star_craft.app.ports.output.page_fetch_gateway import PageFetchPort
from star_craft.domain.value_objects.html_text import extract_text

logger = logging.getLogger(__name__)


class CrawlerInteractor(CrawlerUseCase):
    """Redis 웹사이트 목록 → 페이지 수집 → jsonl 적재 (독립 파이프라인)."""

    def __init__(
        self,
        source: CrawlSourcePort,
        fetcher: PageFetchPort,
        sink: JsonlSinkPort,
    ) -> None:
        self._source = source
        self._fetcher = fetcher
        self._sink = sink

    async def crawl(self) -> CrawlResultDto:
        websites = await self._source.list_websites()
        now = datetime.now(UTC).isoformat()

        pages: list[CrawledPage] = []
        succeeded = 0
        for url in websites:
            fetched = await self._fetcher.fetch(url)
            text = extract_text(fetched.html) if fetched.ok else ""
            if fetched.ok:
                succeeded += 1
            pages.append(
                CrawledPage(
                    url=fetched.url,
                    status_code=fetched.status_code,
                    ok=fetched.ok,
                    content_length=len(fetched.html),
                    text=text,
                    fetched_at=now,
                    error=fetched.error,
                )
            )

        output_path = self._sink.write(CRAWLED_DIR, [asdict(p) for p in pages])
        failed = len(pages) - succeeded
        logger.info(
            "[star_craft] 크롤 완료 | total=%d succeeded=%d failed=%d -> %s",
            len(pages),
            succeeded,
            failed,
            output_path,
        )
        return CrawlResultDto(
            total=len(pages),
            succeeded=succeeded,
            failed=failed,
            output_path=output_path,
        )
