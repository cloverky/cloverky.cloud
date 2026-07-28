import importlib
import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

silicon_valley_router = APIRouter(prefix="/api/v1", tags=["silicon_valley"])

_routers = [
    (
        "admin.adapter.inbound.api.v1.piper_hendricks_ceo_router",
        "hendricks_ceo_router",
    ),
    (
        "admin.adapter.inbound.api.v1.piper_gilfoyle_sys_router",
        "gilfoyle_sys_router",
    ),
    (
        "admin.adapter.inbound.api.v1.piper_dinesh_dash_router",
        "dinesh_dash_router",
    ),
    ("admin.adapter.inbound.api.v1.piper_dunn_coo_router", "dunn_coo_router"),
    (
        "admin.adapter.inbound.api.v1.piper_bighetti_hr_router",
        "bighetti_hr_router",
    ),
    ("admin.adapter.inbound.api.v1.pdf_loader_router", "pdf_loader_router"),
    ("admin.adapter.inbound.api.v1.morningstar_router", "morningstar_router"),
    ("admin.adapter.inbound.api.v1.langchain_chat_router", "langchain_chat_router"),
]

for _mod, _attr in _routers:
    try:
        _m = importlib.import_module(_mod)
        silicon_valley_router.include_router(getattr(_m, _attr))
    except Exception as _e:
        logger.warning("silicon_valley 라우터 로드 실패 — %s: %s", _mod, _e)

__all__ = ["silicon_valley_router"]
