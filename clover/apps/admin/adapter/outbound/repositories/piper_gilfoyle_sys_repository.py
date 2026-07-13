from __future__ import annotations

from admin.app.dtos.piper_gilfoyle_sys_dto import (
    GilfoyleSysQuery,
    GilfoyleSysResponse,
)
from admin.app.ports.output.piper_gilfoyle_sys_port import GilfoyleSysPort


class GilfoyleSysPgRepository(GilfoyleSysPort):
    async def introduce_myself(self, query: GilfoyleSysQuery) -> GilfoyleSysResponse:
        return GilfoyleSysResponse(id=query.id, name=query.name)
