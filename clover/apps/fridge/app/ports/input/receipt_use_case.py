from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptParseResultDto,
    ReceiptUploadResponse,
)
from fridge.adapter.inbound.api.schemas.receipt_schema import ReceiptUploadSchema


class ReceiptUseCase(ABC):
    @abstractmethod
    async def get_status(self, schema: ReceiptUploadSchema) -> ReceiptUploadResponse:
        pass

    @abstractmethod
    async def scan_bytes(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        """업로드된 파일을 그대로 인식한다."""

    @abstractmethod
    async def scan_by_key(self, bucket: str, key: str) -> ReceiptParseResultDto:
        """S3 에 이미 올라간 이미지를 키로 읽어 인식한다."""
