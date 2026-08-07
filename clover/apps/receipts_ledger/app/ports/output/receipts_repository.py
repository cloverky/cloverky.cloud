from __future__ import annotations

from abc import ABC, abstractmethod

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageDetail,
    ReceiptImageUploadResult,
    ReceiptParseSaveCommand,
)


class ReceiptsRepository(ABC):
    @abstractmethod
    async def create(
        self,
        user_email: str,
        s3_bucket: str,
        s3_key: str,
        s3_url: str,
        display_name: str | None = None,
    ) -> ReceiptImageUploadResult:
        """업로드된 영수증 이미지의 위치를 기록하고 저장된 레코드를 반환한다."""
        pass

    @abstractmethod
    async def find_details_by_user_email(
        self, user_email: str
    ) -> dict[str, ReceiptImageDetail]:
        """해당 회원 영수증의 이름·인식 결과를 S3 키로 찾을 수 있게 반환한다.

        키 집합이 곧 소유 목록이므로 목록 필터링 근거로도 쓴다.
        """
        pass

    @abstractmethod
    async def save_parse_result(self, command: ReceiptParseSaveCommand) -> bool:
        """인식 결과를 해당 영수증에 기록한다. 소유자의 영수증이 아니면 False."""
        pass

    @abstractmethod
    async def rename(self, user_email: str, s3_key: str, display_name: str) -> bool:
        """영수증 이름을 바꾼다. 소유자의 영수증이 아니면 False."""
        pass

    @abstractmethod
    async def delete_by_key(self, user_email: str, s3_key: str) -> bool:
        """해당 회원의 영수증 기록을 지운다. 소유자의 영수증이 아니면 False."""
        pass
