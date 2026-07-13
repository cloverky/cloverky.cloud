from __future__ import annotations

from admin.app.dtos.piper_dunn_coo_dto import DunnCooQuery, DunnCooResponse
from admin.app.ports.output.piper_dunn_coo_port import DunnCooPort


class DunnCooPgRepository(DunnCooPort):
    async def introduce_myself(self, query: DunnCooQuery) -> DunnCooResponse:
        return DunnCooResponse(id=query.id, name=query.name)
