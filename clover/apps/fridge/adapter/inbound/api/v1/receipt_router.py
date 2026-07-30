from __future__ import annotations

import json
import re
from datetime import date

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

receipt_router = APIRouter(prefix="/receipt", tags=["receipt"])

_MODEL = "gemini-2.0-flash"
_PROMPT = """이 영수증 이미지에서 구매 정보를 추출하세요.
반드시 아래 JSON 형식만 출력하고 다른 설명은 하지 마세요.
{
  "store_name": "매장명 또는 null",
  "purchased_date": "YYYY-MM-DD 또는 null",
  "items": [
    {"name": "품목명", "quantity": 1, "unit": "개"}
  ]
}
quantity는 1 이상 정수, unit은 개·팩·봉·통·g·ml 중 하나. 읽을 수 없는 품목은 제외."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("JSON 블록을 찾을 수 없습니다.")
    return json.loads(text[start : end + 1])


class ParsedItem(BaseModel):
    name: str
    quantity: int
    unit: str


class ReceiptScanResponse(BaseModel):
    store_name: str | None
    purchased_date: str | None
    items: list[ParsedItem]


@receipt_router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(image: UploadFile = File(...)) -> ReceiptScanResponse:
    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic"}
    mime = image.content_type or "image/jpeg"
    if mime not in allowed:
        raise HTTPException(status_code=415, detail=f"지원하지 않는 이미지 형식: {mime}")

    data = await image.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지 크기는 10MB 이하여야 합니다.")

    from google.genai import types as genai_types

    from core.matrix.wault_keymaker_serect_manager import get_keymaker

    keymaker = get_keymaker()
    if not keymaker.is_gemini_ready():
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY가 설정되지 않았습니다.")

    client = keymaker.get_gemini_client()
    try:
        response = await client.aio.models.generate_content(
            model=_MODEL,
            contents=[
                genai_types.Part.from_bytes(data=data, mime_type=mime),
                _PROMPT,
            ],
        )
        raw = (response.text or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"영수증 인식 실패: {e!s}") from e

    if not raw:
        raise HTTPException(status_code=502, detail="영수증에서 텍스트를 읽지 못했습니다.")

    try:
        parsed = _extract_json(raw)
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=422, detail=f"파싱 실패: {e!s}") from e

    items: list[ParsedItem] = []
    for row in parsed.get("items") or []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        try:
            qty = max(1, int(row.get("quantity") or 1))
        except (TypeError, ValueError):
            qty = 1
        unit = str(row.get("unit") or "개").strip() or "개"
        items.append(ParsedItem(name=name, quantity=qty, unit=unit))

    store = parsed.get("store_name")
    store_name = str(store).strip() if store and str(store).strip() not in ("null", "") else None

    raw_date = parsed.get("purchased_date")
    purchased_date: str | None = None
    if raw_date and str(raw_date).strip() not in ("null", ""):
        try:
            purchased_date = date.fromisoformat(str(raw_date).strip()[:10]).isoformat()
        except ValueError:
            pass

    return ReceiptScanResponse(store_name=store_name, purchased_date=purchased_date, items=items)
