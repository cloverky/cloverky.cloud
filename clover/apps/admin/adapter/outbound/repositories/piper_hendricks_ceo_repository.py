from __future__ import annotations

from admin.app.dtos.piper_hendricks_ceo_dto import (
    HendricksCeoQuery,
    HendricksCeoResponse,
)
from admin.app.ports.output.piper_hendricks_ceo_port import HendricksCeoPort


class HendricksCeoPgRepository(HendricksCeoPort):
    async def introduce_myself(self, query: HendricksCeoQuery) -> HendricksCeoResponse:
        return HendricksCeoResponse(id=query.id, name=query.name)
