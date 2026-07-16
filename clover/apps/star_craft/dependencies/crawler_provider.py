from star_craft.adapter.outbound.filesystem.jsonl_sink_gateway import (
    JsonlFileSinkGateway,
)
from star_craft.adapter.outbound.httpx.page_fetch_gateway import HttpxPageFetchGateway
from star_craft.adapter.outbound.redis.crawl_source_gateway import (
    RedisCrawlSourceGateway,
)
from star_craft.app.ports.input.crawler_use_case import CrawlerUseCase
from star_craft.app.ports.output.crawl_source_gateway import CrawlSourcePort
from star_craft.app.ports.output.jsonl_sink_gateway import JsonlSinkPort
from star_craft.app.ports.output.page_fetch_gateway import PageFetchPort
from star_craft.app.use_cases.crawler_interactor import CrawlerInteractor


def get_crawler_use_case() -> CrawlerUseCase:
    source: CrawlSourcePort = RedisCrawlSourceGateway()
    fetcher: PageFetchPort = HttpxPageFetchGateway()
    sink: JsonlSinkPort = JsonlFileSinkGateway()
    return CrawlerInteractor(source=source, fetcher=fetcher, sink=sink)
