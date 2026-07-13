from fastapi import APIRouter, Depends
from admin.adapter.inbound.api.schemas.piper_dunn_coo_schema import (
    DunnCooSchema,
)
from admin.app.dtos.piper_dunn_coo_dto import DunnCooResponse
from admin.app.ports.input.piper_dunn_coo_use_case import DunnCooUseCase
from admin.dependencies.piper_dunn_coo_provider import get_dunn_coo_use_case

dunn_coo_router = APIRouter(prefix="/dunn", tags=["dunn"])


@dunn_coo_router.get("/myself")
async def introduce_myself(
    use_case: DunnCooUseCase = Depends(get_dunn_coo_use_case),
) -> DunnCooResponse:
    return await use_case.introduce_myself(
        DunnCooSchema(id=4, name="재러드 던 (Jared Dunn)")
    )
