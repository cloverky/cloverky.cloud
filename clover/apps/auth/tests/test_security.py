"""완료 기준: aud 불일치·만료·서명 변조·alg 강제(none/HS256) 토큰이 모두 거부되는지."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from core.security import create_access_token, public_key_pem, verify_token

_AUD = "cloverky-api"


def test_verify_accepts_token_issued_for_same_aud(rsa_keys: tuple[str, str]) -> None:
    token = create_access_token(sub="1", roles=["user"], aud=_AUD)
    payload = verify_token(token, aud=_AUD)
    assert payload.sub == "1"
    assert payload.roles == ["user"]
    assert payload.jti


def test_backend_verifies_with_public_key_only(
    rsa_keys: tuple[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    """auth 컨테이너가 발급한 토큰을 백엔드가 공개키만으로 검증할 수 있어야 한다."""
    token = create_access_token(sub="42", roles=["user"], aud=_AUD)

    monkeypatch.delenv("JWT_PRIVATE_KEY")  # 백엔드 컨테이너 조건 재현

    payload = verify_token(token, aud=_AUD)
    assert payload.sub == "42"


def test_verify_rejects_mismatched_aud(rsa_keys: tuple[str, str]) -> None:
    token = create_access_token(sub="1", roles=["user"], aud="acoder-api")
    with pytest.raises(jwt.InvalidAudienceError):
        verify_token(token, aud=_AUD)


def test_verify_rejects_expired_token(rsa_keys: tuple[str, str]) -> None:
    token = create_access_token(sub="1", roles=["user"], aud=_AUD, expires_min=-1)
    with pytest.raises(jwt.ExpiredSignatureError):
        verify_token(token, aud=_AUD)


def test_verify_rejects_tampered_signature(rsa_keys: tuple[str, str]) -> None:
    token = create_access_token(sub="1", roles=["user"], aud=_AUD)
    header, payload, signature = token.split(".")
    tampered = f"{header}.{payload}.{signature[:-4]}AAAA"
    with pytest.raises(jwt.InvalidSignatureError):
        verify_token(tampered, aud=_AUD)


def test_verify_rejects_alg_none_token(rsa_keys: tuple[str, str]) -> None:
    """개인키 없이 alg=none 으로 위조한 토큰은 거부돼야 한다."""
    claims = _claims()
    forged = jwt.encode(claims, key="", algorithm="none")
    with pytest.raises(jwt.InvalidAlgorithmError):
        verify_token(forged, aud=_AUD)


def test_verify_rejects_hs256_token_signed_with_public_key(
    rsa_keys: tuple[str, str],
) -> None:
    """공개키를 HMAC 비밀키로 악용하는 알고리즘 혼동 공격을 거부해야 한다.

    PyJWT는 encode 단계에서 PEM을 HMAC 키로 쓰는 것을 막으므로, 공격자가 직접
    조립한 토큰을 그대로 재현해 검증부만 시험한다.
    """
    forged = _forge_hs256(_claims(), secret=public_key_pem().encode())
    with pytest.raises(jwt.InvalidAlgorithmError):
        verify_token(forged, aud=_AUD)


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _forge_hs256(claims: dict[str, object], secret: bytes) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps(claims).encode())
    signing_input = f"{header}.{payload}".encode()
    signature = _b64url(hmac.new(secret, signing_input, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def _claims() -> dict[str, object]:
    now = datetime.now(UTC)
    return {
        "sub": "1",
        "roles": ["admin"],
        "aud": _AUD,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=10)).timestamp()),
        "jti": uuid.uuid4().hex,
    }
