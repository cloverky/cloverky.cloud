from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageStorageResult


class ReceiptImageStoragePort(ABC):
    @abstractmethod
    async def upload(
        self, filename: str, content: bytes, content_type: str
    ) -> ReceiptImageStorageResult:
        """영수증 이미지를 오브젝트 스토리지에 저장하고 저장 위치를 반환한다."""
        pass
