from star_craft.adapter.outbound.filesystem.jsonl_sink_gateway import (
    JsonlFileSinkGateway,
)
from star_craft.adapter.outbound.httpx.page_fetch_gateway import HttpxPageFetchGateway
from star_craft.adapter.outbound.redis.scrape_source_gateway import (
    RedisScrapeSourceGateway,
)
from star_craft.app.ports.input.scraper_use_case import ScraperUseCase
from star_craft.app.ports.output.jsonl_sink_gateway import JsonlSinkPort
from star_craft.app.ports.output.page_fetch_gateway import PageFetchPort
from star_craft.app.ports.output.scrape_source_gateway import ScrapeSourcePort
from star_craft.app.use_cases.scraper_interactor import ScraperInteractor


def get_scraper_use_case() -> ScraperUseCase:
    source: ScrapeSourcePort = RedisScrapeSourceGateway()
    fetcher: PageFetchPort = HttpxPageFetchGateway()
    sink: JsonlSinkPort = JsonlFileSinkGateway()
    return ScraperInteractor(source=source, fetcher=fetcher, sink=sink)
