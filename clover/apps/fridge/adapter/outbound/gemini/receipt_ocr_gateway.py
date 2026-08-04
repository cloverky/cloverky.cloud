from __future__ import annotations

import json
import os
import re
from datetime import date

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptLineParsedDto,
    ReceiptParseResultDto,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)

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


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-flash-latest")


def extract_json_block(text: str) -> dict:
    """모델 응답에서 JSON 객체만 뽑는다. 없으면 ValueError."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("JSON 블록을 찾을 수 없습니다.")
    return json.loads(text[start : end + 1])


def _clean_optional(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return None if text in ("", "null") else text


def normalize_scan_payload(parsed: dict) -> ReceiptParseResultDto:
    """모델이 뱉은 dict 를 DTO 로 정규화한다. 깨진 줄은 버리고 전체는 살린다."""
    items: list[ReceiptLineParsedDto] = []
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
        items.append(ReceiptLineParsedDto(name=name, quantity=qty, unit=unit))

    purchased_date = None
    raw_date = _clean_optional(parsed.get("purchased_date"))
    if raw_date:
        try:
            purchased_date = date.fromisoformat(raw_date[:10]).isoformat()
        except ValueError:
            purchased_date = None

    return ReceiptParseResultDto(
        store_name=_clean_optional(parsed.get("store_name")),
        purchased_date=purchased_date,
        items=items,
    )


class ReceiptOcrGateway(ReceiptOcrEnginePort):
    """Gemini Vision 으로 이미지에서 곧바로 구조화 JSON 을 받는다."""

    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        # google.genai 는 venv 에 없을 수 있다 — 호출 시점에만 필요하다.
        from google.genai import types as genai_types

        from core.matrix.wault_keymaker_serect_manager import get_keymaker

        keymaker = get_keymaker()
        if not keymaker.is_gemini_ready():
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

        client = keymaker.get_gemini_client()
        try:
            response = await client.aio.models.generate_content(
                model=_model_name(),
                contents=[
                    genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    _PROMPT,
                ],
            )
            raw = (response.text or "").strip()
        except Exception as e:
            raise ValueError(f"영수증 인식 실패: {e!s}") from e

        if not raw:
            raise ValueError("영수증에서 텍스트를 읽지 못했습니다.")

        return normalize_scan_payload(extract_json_block(raw))
