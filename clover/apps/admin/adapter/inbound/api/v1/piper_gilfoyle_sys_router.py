from fastapi import APIRouter, Depends
from admin.adapter.inbound.api.schemas.piper_gilfoyle_sys_schema import (
    GilfoyleSysSchema,
)
from admin.app.dtos.piper_gilfoyle_sys_dto import GilfoyleSysResponse
from admin.app.ports.input.piper_gilfoyle_sys_use_case import (
    GilfoyleSysUseCase,
)
from admin.dependencies.piper_gilfoyle_sys_provider import (
    get_gilfoyle_sys_use_case,
)

gilfoyle_sys_router = APIRouter(prefix="/gilfoyle", tags=["gilfoyle"])


@gilfoyle_sys_router.get("/myself")
async def introduce_myself(
    use_case: GilfoyleSysUseCase = Depends(get_gilfoyle_sys_use_case),
) -> GilfoyleSysResponse:
    return await use_case.introduce_myself(
        GilfoyleSysSchema(id=2, name="버트람 길포일 (Bertram Gilfoyle)")
    )
