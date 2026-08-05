from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.adapter.outbound.gemini.receipt_ocr_gateway import (
    ReceiptOcrGateway,
)
from clover.apps.fridge.adapter.outbound.repositories.receipt_pg_repository import (
    ReceiptPgRepository,
)
from clover.apps.fridge.adapter.outbound.s3.receipt_image_reader import (
    S3ReceiptImageReader,
)
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.ports.output.receipt_repository import ReceiptRepository
from clover.apps.fridge.app.use_cases.receipt_interactor import ReceiptInteractor
from clover.core.matrix.grid_oracle_database_manager import get_db


def get_receipt_repository(db: AsyncSession = Depends(get_db)) -> ReceiptPgRepository:
    return ReceiptPgRepository(session=db)


def get_receipt_ocr_engine() -> ReceiptOcrEnginePort:
    return ReceiptOcrGateway()


def get_receipt_image_reader() -> ReceiptImageReaderPort:
    return S3ReceiptImageReader()


def get_receipt_use_case(
    repository: ReceiptRepository = Depends(get_receipt_repository),
    ocr_engine: ReceiptOcrEnginePort = Depends(get_receipt_ocr_engine),
    image_reader: ReceiptImageReaderPort = Depends(get_receipt_image_reader),
) -> ReceiptUseCase:
    return ReceiptInteractor(
        repository=repository,
        ocr_engine=ocr_engine,
        image_reader=image_reader,
    )
