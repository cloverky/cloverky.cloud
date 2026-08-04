from __future__ import annotations

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from receipts_ledger.adapter.inbound.api.schemas.receipt_image_schema import (
    ReceiptImageUploadResponse,
    to_receipt_image_upload_response,
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
