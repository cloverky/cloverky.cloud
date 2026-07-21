from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date

from clover.apps.fridge.adapter.outbound.gemini.receipt_parser import GeminiReceiptParser

receipt_router = APIRouter(prefix="/receipt", tags=["receipt"])


class ParsedReceiptItem(BaseModel):
    name: str
    quantity: int
    unit: str


class ReceiptScanResponse(BaseModel):
    store_name: Optional[str]
    purchased_date: Optional[str]
    items: list[ParsedReceiptItem]


@receipt_router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(image: UploadFile = File(...)) -> ReceiptScanResponse:
    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    mime = image.content_type or "image/jpeg"
    if mime not in allowed:
        raise HTTPException(status_code=415, detail=f"지원하지 않는 이미지 형식입니다: {mime}")

    data = await image.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지 크기는 10MB 이하여야 합니다.")

    parser = GeminiReceiptParser()
    result = parser.parse(data, mime)

    return ReceiptScanResponse(
        store_name=result.store_name,
        purchased_date=result.purchased_date.isoformat() if result.purchased_date else None,
        items=[
            ParsedReceiptItem(name=i.name, quantity=i.quantity, unit=i.unit)
            for i in result.items
        ],
    )
