"""S3 Manager — IAM Access Key 기반 S3 클라이언트 팩토리."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

import boto3
from botocore.config import Config

from core.matrix.keymaker_api import get_keymaker

# presigned URL 이 글로벌 호스트(bucket.s3.amazonaws.com)로 만들어지면 S3 가 리전
# 엔드포인트로 307 리다이렉트를 보내면서 서명이 깨진다. 서명 방식과 주소 형식을
# 명시해 리전 호스트로 고정한다.
_S3_CLIENT_CONFIG = Config(
    signature_version="s3v4",
    s3={"addressing_style": "virtual"},
)


class S3Manager:
    """Keymaker가 관리하는 IAM Access Key로 S3 클라이언트를 만들고 재사용한다."""

    def __init__(self) -> None:
        self._keymaker = get_keymaker()
        self._client: Any = None

    def is_ready(self) -> bool:
        return self._keymaker.is_aws_ready()

    def get_client(self) -> Any:
        if self._client is None:
            access_key = self._keymaker.get_aws_access_key_id()
            secret_key = self._keymaker.get_aws_secret_access_key()
            # 키가 비어 있으면 None을 넘겨 boto3 기본 자격증명 체인(IAM Role 등)에 위임한다.
            self._client = boto3.client(
                "s3",
                aws_access_key_id=access_key or None,
                aws_secret_access_key=secret_key or None,
                region_name=self._keymaker.get_aws_default_region(),
                config=_S3_CLIENT_CONFIG,
            )
        return self._client

    def list_bucket_names(self) -> list[str]:
        response = self.get_client().list_buckets()
        return [bucket["Name"] for bucket in response.get("Buckets", [])]


@lru_cache(maxsize=1)
def get_s3_manager() -> S3Manager:
    return S3Manager()
