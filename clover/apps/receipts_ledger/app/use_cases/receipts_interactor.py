from __future__ import annotations

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageUploadCommand,
    ReceiptImageUploadResult,
)
from receipts_ledger.app.ports.input.receipts_use_case import ReceiptsUseCase
from receipts_ledger.app.ports.output.receipt_image_storage_port import (
    ReceiptImageStoragePort,
)
from receipts_ledger.app.ports.output.receipts_repository import ReceiptsRepository


class ReceiptsInteractor(ReceiptsUseCase):
    """영수증 이미지 업로드 오케스트레이션 — 저장은 포트에 위임한다."""

    def __init__(
        self, storage: ReceiptImageStoragePort, repository: ReceiptsRepository
    ) -> None:
        self._storage = storage
        self._repository = repository

    async def upload_receipt_image(
        self, command: ReceiptImageUploadCommand
    ) -> ReceiptImageUploadResult:
        stored = await self._storage.upload(
            command.filename, command.content, command.content_type
        )
        return await self._repository.create(
            user_email=command.user_email,
            s3_bucket=stored.bucket,
            s3_key=stored.key,
            s3_url=stored.url,
        )
