from __future__ import annotations

import asyncio
import os

from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)

_S3_REGION = os.getenv("AWS_DEFAULT_REGION", "ap-northeast-2")


class S3ReceiptImageReader(ReceiptImageReaderPort):
    async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
        return await asyncio.to_thread(self._read_sync, bucket, key)

    def _read_sync(self, bucket: str, key: str) -> tuple[bytes, str]:
        # boto3 는 venv 에 없을 수 있다 — 호출 시점에만 필요하다.
        import boto3
        from botocore.exceptions import ClientError

        client = boto3.client("s3", region_name=_S3_REGION)
        try:
            obj = client.get_object(Bucket=bucket, Key=key)
        except ClientError as e:
            raise FileNotFoundError(f"S3에서 영수증을 찾을 수 없습니다: {key}") from e
        body: bytes = obj["Body"].read()
        content_type: str = obj.get("ContentType") or "image/jpeg"
        return body, content_type
