from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageListItem,
    ReceiptImageStorageResult,
)


class ReceiptImageStoragePort(ABC):
    @abstractmethod
    async def upload(
        self, filename: str, content: bytes, content_type: str
    ) -> ReceiptImageStorageResult:
        """영수증 이미지를 오브젝트 스토리지에 저장하고 저장 위치를 반환한다."""
        pass

    @abstractmethod
    async def list_images(self) -> list[ReceiptImageListItem]:
        """적재된 영수증 이미지 목록을 최신순으로 반환한다."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        """영수증 이미지를 오브젝트 스토리지에서 지운다. 이미 없어도 성공으로 본다."""
        pass
