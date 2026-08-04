from __future__ import annotations

import asyncio
import logging
import os
import uuid

from botocore.exceptions import BotoCoreError, ClientError
from receipts_ledger.app.dtos.receipt_image_dto import (
    ReceiptImageListItem,
    ReceiptImageStorageResult,
)
from receipts_ledger.app.ports.output.receipt_image_storage_port import (
    ReceiptImageStoragePort,
)

from core.matrix.s3_manager import get_s3_manager

logger = logging.getLogger(__name__)

_S3_BUCKET = os.getenv("S3_BUCKET", "")
_KEY_PREFIX = "receipts"
_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")
# 버킷을 공개로 바꾸지 않고 열람만 허용하는 임시 링크의 유효시간.
_VIEW_URL_EXPIRES_SECONDS = 3600


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

    async def list_images(self) -> list[ReceiptImageListItem]:
        if not self._manager.is_ready():
            raise RuntimeError("AWS 자격증명이 설정되어 있지 않습니다.")

        client = self._manager.get_client()
        try:
            pages = await asyncio.to_thread(self._list_all_objects, client)
        except (BotoCoreError, ClientError) as exc:
            logger.error(
                "[ReceiptsLedger] S3 목록 조회 실패 — bucket=%s: %s", self._bucket, exc
            )
            raise RuntimeError("영수증 목록을 불러오지 못했습니다.") from exc

        items: list[ReceiptImageListItem] = []
        for obj in pages:
            key = obj["Key"]
            # 콘솔에서 만든 폴더 마커(0바이트, key 끝이 /)와 이미지가 아닌 객체는 제외한다.
            if key.endswith("/") or not key.lower().endswith(_IMAGE_EXTENSIONS):
                continue
            items.append(
                ReceiptImageListItem(
                    key=key,
                    filename=key.rsplit("/", 1)[-1],
                    size_bytes=obj["Size"],
                    uploaded_at=obj["LastModified"],
                    view_url=client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": self._bucket, "Key": key},
                        ExpiresIn=_VIEW_URL_EXPIRES_SECONDS,
                    ),
                )
            )

        items.sort(key=lambda i: i.uploaded_at, reverse=True)
        logger.info("[ReceiptsLedger] S3 영수증 %d건 조회", len(items))
        return items

    def _list_all_objects(self, client: object) -> list[dict]:
        paginator = client.get_paginator("list_objects_v2")  # type: ignore[attr-defined]
        objects: list[dict] = []
        for page in paginator.paginate(Bucket=self._bucket, Prefix=f"{_KEY_PREFIX}/"):
            objects.extend(page.get("Contents", []))
        return objects
