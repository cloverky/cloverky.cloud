from fastapi import APIRouter, Depends
from admin.adapter.inbound.api.schemas.piper_dinesh_dash_schema import (
    DineshDashSchema,
)
from admin.app.dtos.piper_dinesh_dash_dto import DineshDashResponse
from admin.app.ports.input.piper_dinesh_dash_use_case import DineshDashUseCase
from admin.dependencies.piper_dinesh_dash_provider import (
    get_dinesh_dash_use_case,
)

dinesh_dash_router = APIRouter(prefix="/dinesh", tags=["dinesh"])


@dinesh_dash_router.get("/myself")
async def introduce_myself(
    use_case: DineshDashUseCase = Depends(get_dinesh_dash_use_case),
) -> DineshDashResponse:
    return await use_case.introduce_myself(
        DineshDashSchema(id=3, name="디네쉬 추그타이 (Dinesh Chugtai)")
    )
