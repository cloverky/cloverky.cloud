from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from star_craft.app.ports.input.crawler_use_case import CrawlerUseCase
from star_craft.dependencies.crawler_provider import get_crawler_use_case

crawler_router = APIRouter(prefix="/crawler", tags=["crawler"])


@crawler_router.post("/run")
async def run_crawler(
    use_case: CrawlerUseCase = Depends(get_crawler_use_case),
) -> dict[str, object]:
    try:
        result = await use_case.crawl()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "total": result.total,
        "succeeded": result.succeeded,
        "failed": result.failed,
        "output_path": result.output_path,
    }
