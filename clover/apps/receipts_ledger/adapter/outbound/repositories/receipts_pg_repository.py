from __future__ import annotations

from datetime import date, datetime, timezone

from receipts_ledger.adapter.outbound.orm.receipt_image_orm import ReceiptImageOrm
from receipts_ledger.app.dtos.receipt_image_dto import (
    ParsedItem,
    ReceiptImageUploadResult,
    ReceiptParseResult,
    ReceiptParseSaveCommand,
)
from receipts_ledger.app.ports.output.receipts_repository import ReceiptsRepository
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def _parse_date(value: str | None) -> date | None:
    """OCR 이 'YYYY-MM-DD' 로 주지 않는 경우가 있어 실패하면 그냥 비운다."""
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


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

    async def find_parse_results_by_user_email(
        self, user_email: str
    ) -> dict[str, ReceiptParseResult]:
        result = await self.session.execute(
            select(ReceiptImageOrm).where(ReceiptImageOrm.user_email == user_email)
        )
        parsed: dict[str, ReceiptParseResult] = {}
        for row in result.scalars().all():
            if row.parsed_at is None:
                continue
            parsed[row.s3_key] = ReceiptParseResult(
                store_name=row.store_name,
                purchased_date=row.purchased_date,
                items=[
                    ParsedItem(
                        name=str(i.get("name", "")),
                        quantity=int(i.get("quantity", 0) or 0),
                        unit=str(i.get("unit", "")),
                    )
                    for i in (row.parsed_items or [])
                ],
                parsed_at=row.parsed_at,
            )
        return parsed

    async def save_parse_result(self, command: ReceiptParseSaveCommand) -> bool:
        # user_email 을 함께 걸어 남의 영수증에 결과를 덮어쓰지 못하게 한다.
        result = await self.session.execute(
            select(ReceiptImageOrm).where(
                ReceiptImageOrm.user_email == command.user_email,
                ReceiptImageOrm.s3_key == command.s3_key,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return False

        row.store_name = command.store_name
        row.purchased_date = _parse_date(command.purchased_date)
        row.parsed_items = [
            {"name": i.name, "quantity": i.quantity, "unit": i.unit}
            for i in command.items
        ]
        row.parsed_at = datetime.now(timezone.utc)
        row.status = "parsed"
        await self.session.commit()
        return True

    async def delete_by_key(self, user_email: str, s3_key: str) -> bool:
        result = await self.session.execute(
            select(ReceiptImageOrm).where(
                ReceiptImageOrm.user_email == user_email,
                ReceiptImageOrm.s3_key == s3_key,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return False

        await self.session.delete(row)
        await self.session.commit()
        return True
