"""JWT 발급/검증 — RS256 비대칭키.

발급 함수(create_access_token, create_refresh_token)는 auth 컨테이너 전용이며
호출 시점에 JWT_PRIVATE_KEY를 읽는다(모듈 로드 시 읽지 않음 — 백엔드 컨테이너가
개인키 없이 이 모듈을 import만 해도 에러가 나면 안 된다).
검증 함수(verify_token)는 모든 컨테이너 공용이며 JWT_PUBLIC_KEY만 사용한다.
"""

from __future__ import annotations

import base64
import binascii
import os
import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal, TypedDict

import jwt
from pydantic import BaseModel

_ALGORITHM = "RS256"
_JWT_KID = os.getenv("JWT_KID", "cloverky-1")


class CookieKwargs(TypedDict):
    domain: str
    secure: bool
    httponly: bool
    samesite: Literal["lax", "strict", "none"]


COOKIE_KWARGS: CookieKwargs = {
    "domain": ".cloverky.cloud",
    "secure": True,
    "httponly": True,
    "samesite": "lax",
}


class TokenPayload(BaseModel):
    sub: str
    roles: list[str]
    aud: str
    exp: int
    iat: int
    jti: str


def _decode_pem(env_name: str) -> str:
    """PEM은 개행 포함 문제를 피하려 base64로 인코딩해 env var에 넣는 것을 기본으로
    한다. base64가 아니면(예: 로컬에서 \\n 이스케이프로 직접 넣은 경우) 원본을
    보정해 반환한다."""
    raw = os.getenv(env_name, "")
    if not raw:
        raise RuntimeError(f"{env_name} 이 설정되지 않았습니다.")
    try:
        decoded = base64.b64decode(raw, validate=True).decode("utf-8")
        if "BEGIN" in decoded:
            return decoded
    except (binascii.Error, UnicodeDecodeError, ValueError):
        pass
    return raw.replace("\\n", "\n")


def _private_key() -> str:
    return _decode_pem("JWT_PRIVATE_KEY")


def public_key_pem() -> str:
    """공개키 PEM — verify_token 내부 및 JWKS 엔드포인트 양쪽에서 사용."""
    return _decode_pem("JWT_PUBLIC_KEY")


def _encode(*, sub: str, roles: list[str], aud: str, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": sub,
        "roles": roles,
        "aud": aud,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(
        payload, _private_key(), algorithm=_ALGORITHM, headers={"kid": _JWT_KID}
    )


def create_access_token(
    sub: str, roles: list[str], aud: str, expires_min: int = 10
) -> str:
    return _encode(
        sub=sub, roles=roles, aud=aud, expires_delta=timedelta(minutes=expires_min)
    )


def create_refresh_token(
    sub: str, aud: str = "cloverky-auth", expires_days: int = 14
) -> str:
    return _encode(
        sub=sub, roles=[], aud=aud, expires_delta=timedelta(days=expires_days)
    )


def peek_jti(token: str) -> str:
    """서명 검증 없이 jti만 추출한다. 발급 직후 자기 자신의 토큰에서 jti를
    읽어 리프레시 저장소에 기록하는 용도로만 사용한다(신뢰된 컨텍스트)."""
    claims = jwt.decode(token, options={"verify_signature": False})
    return str(claims["jti"])


def verify_token(token: str, aud: str) -> TokenPayload:
    claims = jwt.decode(token, public_key_pem(), algorithms=[_ALGORITHM], audience=aud)
    return TokenPayload.model_validate(claims)
