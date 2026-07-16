import logging

from fastapi import APIRouter

from star_craft.adapter.inbound.api.v1.crawler_router import crawler_router
from star_craft.adapter.inbound.api.v1.scraper_router import scraper_router
from star_craft.adapter.inbound.api.v1.semantic_router import semantic_router
from star_craft.adapter.inbound.api.v1.terran_vessel_gemini_router import (
    terran_vessel_gemini_router,
)

logger = logging.getLogger(__name__)

star_craft_router = APIRouter(prefix="/api/star_craft", tags=["star_craft"])
star_craft_router.include_router(terran_vessel_gemini_router)
star_craft_router.include_router(semantic_router)
star_craft_router.include_router(crawler_router)
star_craft_router.include_router(scraper_router)

__all__ = ["star_craft_router"]
