from __future__ import annotations

from clover.apps.fridge.app.dtos.receipt_dto import ReceiptParseResultDto
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.dependencies.receipt_provider import get_receipt_use_case
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

receipt_router = APIRouter(prefix="/receipt", tags=["receipt"])

_ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic"}
_MAX_BYTES = 10 * 1024 * 1024

# 외부 호출(OCR) 실패는 502 가 아니라 503 으로 낸다.
# Cloudflare 는 오리진이 낸 502/504 를 자기 오류 페이지로 갈아치우면서 CORS 헤더까지
# 없애 버린다. 그러면 브라우저에는 진짜 원인 대신 "No Access-Control-Allow-Origin"
# 이라는 엉뚱한 CORS 에러만 보인다. 503 은 그대로 통과해서 detail 이 프론트까지 간다.
_UPSTREAM_FAILED = 503


class ParsedItem(BaseModel):
    name: str
    quantity: int
    unit: str


class ReceiptScanResponse(BaseModel):
    store_name: str | None
    purchased_date: str | None
    items: list[ParsedItem]


class ScanByKeyRequest(BaseModel):
    s3_bucket: str
    s3_key: str


def _to_response(result: ReceiptParseResultDto) -> ReceiptScanResponse:
    return ReceiptScanResponse(
        store_name=result.store_name,
        purchased_date=result.purchased_date,
        items=[
            ParsedItem(name=i.name, quantity=i.quantity, unit=i.unit)
            for i in result.items
        ],
    )


@receipt_router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(
    image: UploadFile = File(...),
    use_case: ReceiptUseCase = Depends(get_receipt_use_case),
) -> ReceiptScanResponse:
    mime = image.content_type or "image/jpeg"
    if mime not in _ALLOWED:
        raise HTTPException(status_code=415, detail=f"지원하지 않는 이미지 형식: {mime}")

    data = await image.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="이미지 크기는 10MB 이하여야 합니다.")

    try:
        result = await use_case.scan_bytes(data, mime)
    except ValueError as e:
        raise HTTPException(status_code=_UPSTREAM_FAILED, detail=str(e)) from e

    return _to_response(result)


@receipt_router.post("/scan-key", response_model=ReceiptScanResponse)
async def scan_receipt_by_key(
    body: ScanByKeyRequest,
    use_case: ReceiptUseCase = Depends(get_receipt_use_case),
) -> ReceiptScanResponse:
    """이미 S3 에 올라간 영수증을 키로 읽어 인식한다 — 파일을 두 번 올리지 않기 위함."""
    try:
        result = await use_case.scan_by_key(body.s3_bucket, body.s3_key)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=_UPSTREAM_FAILED, detail=str(e)) from e

    return _to_response(result)
