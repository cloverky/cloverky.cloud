from __future__ import annotations

import asyncio
import logging
import os
import uuid

from botocore.exceptions import BotoCoreError, ClientError
from receipts_ledger.app.dtos.receipt_image_dto import ReceiptImageStorageResult
from receipts_ledger.app.ports.output.receipt_image_storage_port import (
    ReceiptImageStoragePort,
)

from core.matrix.s3_manager import get_s3_manager

logger = logging.getLogger(__name__)

_S3_BUCKET = os.getenv("S3_BUCKET", "")
_KEY_PREFIX = "receipts"


class ReceiptImageStorageGateway(ReceiptImageStoragePort):
    """영수증 이미지를 S3에 저장하는 아웃바운드 어댑터."""

    def __init__(self, bucket: str = _S3_BUCKET) -> None:
        if not bucket:
            raise RuntimeError("S3_BUCKET 환경변수가 설정되어 있지 않습니다.")
        self._bucket = bucket
        self._manager = get_s3_manager()

    async def upload(
        self, filename: str, content: bytes, content_type: str
    ) -> ReceiptImageStorageResult:
        if not self._manager.is_ready():
            raise RuntimeError("AWS 자격증명이 설정되어 있지 않습니다.")

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
        key = f"{_KEY_PREFIX}/{uuid.uuid4().hex}.{ext}"
        client = self._manager.get_client()

        try:
            await asyncio.to_thread(
                client.put_object,
                Bucket=self._bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error(
                "[ReceiptsLedger] S3 업로드 실패 — bucket=%s key=%s: %s",
                self._bucket,
                key,
                exc,
            )
            raise RuntimeError("영수증 이미지 업로드에 실패했습니다.") from exc

        logger.info(
            "[ReceiptsLedger] S3 업로드 완료 — bucket=%s key=%s", self._bucket, key
        )
        url = f"https://{self._bucket}.s3.{client.meta.region_name}.amazonaws.com/{key}"
        return ReceiptImageStorageResult(bucket=self._bucket, key=key, url=url)
