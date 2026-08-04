from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageListItem,
    ReceiptImageUploadCommand,
    ReceiptImageUploadResult,
)


class ReceiptsUseCase(ABC):
    @abstractmethod
    async def upload_receipt_image(
        self, command: ReceiptImageUploadCommand
    ) -> ReceiptImageUploadResult:
        """영수증 이미지를 S3에 저장하고 업로드 기록을 남긴다."""
        pass

    @abstractmethod
    async def list_receipt_images(self) -> list[ReceiptImageListItem]:
        """S3에 적재된 영수증 이미지 목록을 최신순으로 반환한다."""
        pass
