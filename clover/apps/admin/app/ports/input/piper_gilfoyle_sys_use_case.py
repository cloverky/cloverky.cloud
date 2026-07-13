from __future__ import annotations

from abc import ABC, abstractmethod

from admin.adapter.inbound.api.schemas.piper_gilfoyle_sys_schema import (
    GilfoyleSysSchema,
)

from admin.app.dtos.piper_gilfoyle_sys_dto import (
    GilfoyleSysResponse,
)


class GilfoyleSysUseCase(ABC):
    @abstractmethod
    def introduce_myself(self, schema: GilfoyleSysSchema) -> GilfoyleSysResponse:
        """길포일의 자기소개 메소드"""
        pass
