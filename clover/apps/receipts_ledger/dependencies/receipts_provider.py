from fastapi import Depends
from receipts_ledger.adapter.outbound.repositories.receipts_pg_repository import (
    ReceiptsPgRepository,
)
from receipts_ledger.adapter.outbound.s3.receipt_image_storage_gateway import (
    ReceiptImageStorageGateway,
)
from receipts_ledger.app.ports.input.receipts_use_case import ReceiptsUseCase
from receipts_ledger.app.ports.output.receipt_image_storage_port import (
    ReceiptImageStoragePort,
)
from receipts_ledger.app.ports.output.receipts_repository import ReceiptsRepository
from receipts_ledger.app.use_cases.receipts_interactor import ReceiptsInteractor
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.oracle_database import get_db


def get_receipts_repository(
    db: AsyncSession = Depends(get_db),
) -> ReceiptsRepository:
    return ReceiptsPgRepository(session=db)


def get_receipt_image_storage() -> ReceiptImageStoragePort:
    return ReceiptImageStorageGateway()


def get_receipts_use_case(
    repository: ReceiptsRepository = Depends(get_receipts_repository),
    storage: ReceiptImageStoragePort = Depends(get_receipt_image_storage),
) -> ReceiptsUseCase:
    return ReceiptsInteractor(storage=storage, repository=repository)
