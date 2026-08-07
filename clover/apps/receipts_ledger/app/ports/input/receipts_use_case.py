from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageListItem,
    ReceiptImageUploadCommand,
    ReceiptImageUploadResult,
    ReceiptParseSaveCommand,
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

    @abstractmethod
    async def list_user_receipt_images(
        self, user_email: str
    ) -> list[ReceiptImageListItem]:
        """해당 회원이 업로드한 영수증만 인식 결과와 함께 최신순으로 반환한다."""
        pass

    @abstractmethod
    async def save_parse_result(self, command: ReceiptParseSaveCommand) -> bool:
        """스캔에 성공한 영수증에 인식 결과를 붙인다. 소유자가 아니면 False."""
        pass

    @abstractmethod
    async def rename_receipt_image(
        self, user_email: str, s3_key: str, display_name: str
    ) -> bool:
        """영수증에 붙인 이름을 바꾼다. 소유자가 아니면 False."""
        pass

    @abstractmethod
    async def delete_receipt_image(self, user_email: str, s3_key: str) -> bool:
        """영수증을 S3와 DB 양쪽에서 지운다. 소유자가 아니면 False."""
        pass
