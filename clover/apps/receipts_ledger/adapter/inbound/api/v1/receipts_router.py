from __future__ import annotations

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from receipts_ledger.adapter.inbound.api.schemas.receipt_image_schema import (
    ReceiptImageListResponse,
    ReceiptImageUploadResponse,
    ReceiptParseSaveRequest,
    to_receipt_image_list_response,
    to_receipt_image_upload_response,
    to_receipt_parse_save_command,
)
from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageUploadCommand
from receipts_ledger.app.ports.input.receipts_use_case import ReceiptsUseCase
from receipts_ledger.dependencies.receipts_provider import get_receipts_use_case

receipts_router = APIRouter(prefix="/api/receipts", tags=["receipts"])

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@receipts_router.post("/images", summary="영수증 이미지 업로드 → S3 저장")
async def upload_receipt_image(
    x_user_email: str = Header(..., alias="X-User-Email"),
    file: UploadFile = File(...),
    use_case: ReceiptsUseCase = Depends(get_receipts_use_case),
) -> ReceiptImageUploadResponse:
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, detail="JPG, PNG, WEBP 파일만 업로드할 수 있습니다."
        )

    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="파일이 10MB를 초과합니다.")

    try:
        result = await use_case.upload_receipt_image(
            ReceiptImageUploadCommand(
                user_email=x_user_email,
                filename=file.filename or "receipt",
                content=content,
                content_type=file.content_type,
            )
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return to_receipt_image_upload_response(result)


@receipts_router.get("/images", summary="S3에 적재된 영수증 목록 조회")
async def list_receipt_images(
    use_case: ReceiptsUseCase = Depends(get_receipts_use_case),
) -> ReceiptImageListResponse:
    try:
        items = await use_case.list_receipt_images()
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return to_receipt_image_list_response(items)


@receipts_router.get("/images/mine", summary="내가 올린 영수증 목록 조회")
async def list_my_receipt_images(
    x_user_email: str = Header(..., alias="X-User-Email"),
    use_case: ReceiptsUseCase = Depends(get_receipts_use_case),
) -> ReceiptImageListResponse:
    try:
        items = await use_case.list_user_receipt_images(x_user_email)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return to_receipt_image_list_response(items)


@receipts_router.post("/images/parsed", summary="영수증 인식 결과 저장")
async def save_receipt_parse_result(
    body: ReceiptParseSaveRequest,
    x_user_email: str = Header(..., alias="X-User-Email"),
    use_case: ReceiptsUseCase = Depends(get_receipts_use_case),
) -> dict[str, bool]:
    """스캔에 성공한 영수증에 가게명·품목을 붙여 목록에서 사진과 함께 보이게 한다."""
    try:
        saved = await use_case.save_parse_result(
            to_receipt_parse_save_command(x_user_email, body)
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not saved:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    return {"saved": True}


@receipts_router.delete("/images", summary="내가 올린 영수증 삭제")
async def delete_receipt_image(
    key: str = Query(..., description="삭제할 영수증의 S3 키"),
    x_user_email: str = Header(..., alias="X-User-Email"),
    use_case: ReceiptsUseCase = Depends(get_receipts_use_case),
) -> dict[str, bool]:
    """S3 오브젝트와 업로드 기록을 함께 지운다. 남의 영수증은 404 로 막힌다."""
    try:
        deleted = await use_case.delete_receipt_image(x_user_email, key)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="영수증을 찾을 수 없습니다.")
    return {"deleted": True}
