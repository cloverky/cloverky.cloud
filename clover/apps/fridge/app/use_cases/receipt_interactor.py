from __future__ import annotations

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptParseResultDto,
    ReceiptQuery,
    ReceiptUploadResponse,
)
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.ports.output.receipt_repository import ReceiptRepository
from fridge.adapter.inbound.api.schemas.receipt_schema import ReceiptUploadSchema


class ReceiptInteractor(ReceiptUseCase):
    def __init__(
        self,
        repository: ReceiptRepository,
        ocr_engine: ReceiptOcrEnginePort,
        image_reader: ReceiptImageReaderPort,
    ) -> None:
        self.repository = repository
        self.ocr_engine = ocr_engine
        self.image_reader = image_reader

    async def get_status(self, schema: ReceiptUploadSchema) -> ReceiptUploadResponse:
        return await self.repository.get_status(
            ReceiptQuery(
                user_id=schema.user_id,
                status=schema.status,
            )
        )

    async def scan_bytes(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        return await self.ocr_engine.extract(image_bytes, mime_type)

    async def scan_by_key(self, bucket: str, key: str) -> ReceiptParseResultDto:
        image_bytes, content_type = await self.image_reader.read(bucket, key)
        return await self.ocr_engine.extract(image_bytes, content_type)
