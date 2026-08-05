"""완료 기준: 인터랙터가 S3 → OCR 순서를 지키는지 — 네트워크 없이."""

from __future__ import annotations

import pytest

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptLineParsedDto,
    ReceiptParseResultDto,
)
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.use_cases.receipt_interactor import ReceiptInteractor

PARSED = ReceiptParseResultDto(
    store_name="OO마트",
    purchased_date="2026-08-04",
    items=[ReceiptLineParsedDto(name="사과", quantity=3, unit="개")],
)


class FakeReader(ReceiptImageReaderPort):
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
        self.calls.append((bucket, key))
        return b"IMAGEBYTES", "image/png"


class FakeOcr(ReceiptOcrEnginePort):
    def __init__(self) -> None:
        self.calls: list[tuple[bytes, str]] = []

    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        self.calls.append((image_bytes, mime_type))
        return PARSED


def _interactor(reader: ReceiptImageReaderPort, ocr: ReceiptOcrEnginePort):
    return ReceiptInteractor(repository=None, ocr_engine=ocr, image_reader=reader)


async def test_scan_by_key_reads_then_extracts() -> None:
    """S3 에서 읽은 바이트와 content_type 을 그대로 OCR 에 넘긴다."""
    reader, ocr = FakeReader(), FakeOcr()

    result = await _interactor(reader, ocr).scan_by_key("my-bucket", "receipts/a.png")

    assert reader.calls == [("my-bucket", "receipts/a.png")]
    assert ocr.calls == [(b"IMAGEBYTES", "image/png")]
    assert result.items[0].name == "사과"


async def test_scan_bytes_skips_s3() -> None:
    """파일을 직접 받은 경우 S3 를 건드리지 않는다."""
    reader, ocr = FakeReader(), FakeOcr()

    result = await _interactor(reader, ocr).scan_bytes(b"DIRECT", "image/webp")

    assert reader.calls == []
    assert ocr.calls == [(b"DIRECT", "image/webp")]
    assert result.store_name == "OO마트"


async def test_missing_image_propagates() -> None:
    """S3 에 없으면 FileNotFoundError 가 그대로 올라가고 OCR 은 안 부른다."""

    class Missing(ReceiptImageReaderPort):
        async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
            raise FileNotFoundError("없음")

    ocr = FakeOcr()

    with pytest.raises(FileNotFoundError):
        await _interactor(Missing(), ocr).scan_by_key("b", "k")

    assert ocr.calls == []
