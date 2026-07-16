from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from star_craft.app.ports.input.scraper_use_case import ScraperUseCase
from star_craft.dependencies.scraper_provider import get_scraper_use_case

scraper_router = APIRouter(prefix="/scraper", tags=["scraper"])


@scraper_router.post("/run")
async def run_scraper(
    use_case: ScraperUseCase = Depends(get_scraper_use_case),
) -> dict[str, object]:
    try:
        result = await use_case.scrape()
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "pages": result.pages,
        "matches": result.matches,
        "output_path": result.output_path,
    }
