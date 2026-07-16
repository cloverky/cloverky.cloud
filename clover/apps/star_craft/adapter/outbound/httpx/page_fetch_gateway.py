from __future__ import annotations

import httpx
from star_craft.app.dtos.web_page_dto import FetchedPage
from star_craft.app.ports.output.page_fetch_gateway import PageFetchPort

_USER_AGENT = "cloverky-star_craft-bot/1.0 (+https://cloverky.cloud)"


class HttpxPageFetchGateway(PageFetchPort):
    """httpx 기반 페이지 수집 어댑터. 네트워크 오류는 ok=False로 흡수한다."""

    def __init__(self, timeout: float = 20.0) -> None:
        self._timeout = timeout

    async def fetch(self, url: str) -> FetchedPage:
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                follow_redirects=True,
                headers={"User-Agent": _USER_AGENT},
            ) as client:
                resp = await client.get(url)
            return FetchedPage(
                url=url,
                status_code=resp.status_code,
                html=resp.text,
                ok=resp.is_success,
                error=None if resp.is_success else f"HTTP {resp.status_code}",
            )
        except httpx.HTTPError as e:
            return FetchedPage(url=url, status_code=0, html="", ok=False, error=str(e))
