"""완료 기준: Gemini 응답 문자열이 DTO로 정규화되는지 — 네트워크 없이."""

from __future__ import annotations

import pytest

from fridge.adapter.outbound.gemini.receipt_ocr_gateway import (
    extract_json_block,
    normalize_scan_payload,
)


def test_json_fence_is_stripped() -> None:
    """```json 펜스로 감싸여 와도 본문만 뽑는다."""
    raw = '```json\n{"store_name": "OO마트", "items": []}\n```'

    assert extract_json_block(raw)["store_name"] == "OO마트"


def test_bare_json_without_fence() -> None:
    """펜스가 없어도 첫 { 부터 마지막 } 까지를 읽는다."""
    raw = '설명이 앞에 붙어도 {"store_name": null, "items": []} 뒤에도 붙음'

    assert extract_json_block(raw)["store_name"] is None


def test_missing_json_raises() -> None:
    """JSON 블록이 없으면 ValueError."""
    with pytest.raises(ValueError):
        extract_json_block("아무 JSON도 없는 문장")


def test_items_are_normalized() -> None:
    """수량은 1 이상 정수로, 단위는 비면 '개'로 채운다."""
    result = normalize_scan_payload(
        {
            "store_name": "OO마트",
            "purchased_date": "2026-08-04",
            "items": [
                {"name": "사과", "quantity": 3, "unit": "개"},
                {"name": "우유", "quantity": 0, "unit": ""},
                {"name": "달걀", "quantity": "여섯", "unit": "판"},
            ],
        }
    )

    assert result.store_name == "OO마트"
    assert result.purchased_date == "2026-08-04"
    assert [(i.name, i.quantity, i.unit) for i in result.items] == [
        ("사과", 3, "개"),
        ("우유", 1, "개"),
        ("달걀", 1, "판"),
    ]


def test_nameless_and_malformed_rows_are_dropped() -> None:
    """이름이 없는 줄과 dict 가 아닌 줄은 버린다."""
    result = normalize_scan_payload(
        {"items": [{"name": "  "}, "문자열", {"name": "두부", "quantity": 2, "unit": "모"}]}
    )

    assert [(i.name, i.quantity, i.unit) for i in result.items] == [("두부", 2, "모")]


def test_null_store_and_date_become_none() -> None:
    """모델이 문자열 'null' 을 뱉어도 None 으로 본다."""
    result = normalize_scan_payload(
        {"store_name": "null", "purchased_date": "null", "items": []}
    )

    assert result.store_name is None
    assert result.purchased_date is None


def test_unparseable_date_becomes_none() -> None:
    """날짜 형식이 깨지면 None — 전체를 실패시키지 않는다."""
    result = normalize_scan_payload({"purchased_date": "2026년 8월", "items": []})

    assert result.purchased_date is None
