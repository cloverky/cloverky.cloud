from __future__ import annotations

from receipts_ledger.adapter.outbound.orm.receipt_image_orm import ReceiptImageOrm
from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageUploadResult
from receipts_ledger.app.ports.output.receipts_repository import ReceiptsRepository
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class ReceiptsPgRepository(ReceiptsRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self, user_email: str, s3_bucket: str, s3_key: str, s3_url: str
    ) -> ReceiptImageUploadResult:
        row = ReceiptImageOrm(
            user_email=user_email,
            s3_bucket=s3_bucket,
            s3_key=s3_key,
            s3_url=s3_url,
            status="pending",
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return ReceiptImageUploadResult(
            id=row.id,
            s3_bucket=row.s3_bucket,
            s3_key=row.s3_key,
            s3_url=row.s3_url,
            status=row.status,
        )

    async def find_keys_by_user_email(self, user_email: str) -> list[str]:
        result = await self.session.execute(
            select(ReceiptImageOrm.s3_key).where(
                ReceiptImageOrm.user_email == user_email
            )
        )
        return list(result.scalars().all())
