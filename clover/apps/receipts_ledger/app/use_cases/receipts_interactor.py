from __future__ import annotations

from dataclasses import replace

from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageListItem,
    ReceiptImageUploadCommand,
    ReceiptImageUploadResult,
    ReceiptParseSaveCommand,
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

    async def list_receipt_images(self) -> list[ReceiptImageListItem]:
        return await self._storage.list_images()

    async def list_user_receipt_images(
        self, user_email: str
    ) -> list[ReceiptImageListItem]:
        # 소유자 판별은 업로드 기록(DB)이 근거다. S3 키에는 회원 정보가 없으므로
        # 전체 목록을 회원의 키 집합으로 걸러 남의 영수증이 섞이지 않게 한다.
        owned_keys = set(await self._repository.find_keys_by_user_email(user_email))
        if not owned_keys:
            return []

        # 파일 정보는 S3, 인식 결과는 DB 에 있어 키를 기준으로 합친다.
        parsed = await self._repository.find_parse_results_by_user_email(user_email)
        return [
            replace(item, parsed=parsed.get(item.key))
            for item in await self._storage.list_images()
            if item.key in owned_keys
        ]

    async def save_parse_result(self, command: ReceiptParseSaveCommand) -> bool:
        return await self._repository.save_parse_result(command)

    async def delete_receipt_image(self, user_email: str, s3_key: str) -> bool:
        # DB 를 먼저 지운다. S3 삭제가 실패하면 고아 객체가 남지만,
        # 반대로 하면 목록에 열 수 없는 영수증이 남아 사용자에게 더 나쁘다.
        if not await self._repository.delete_by_key(user_email, s3_key):
            return False
        await self._storage.delete(s3_key)
        return True
