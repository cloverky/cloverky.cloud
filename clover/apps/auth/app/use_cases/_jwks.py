"""RS256 공개키 PEM → JWK(JSON Web Key Set) 변환. 순수 함수."""

from __future__ import annotations

import base64
from typing import Any

from cryptography.hazmat.primitives.asymmetric.rsa import RSAPublicKey
from cryptography.hazmat.primitives.serialization import load_pem_public_key


def _b64url_uint(n: int) -> str:
    length = (n.bit_length() + 7) // 8 or 1
    return base64.urlsafe_b64encode(n.to_bytes(length, "big")).rstrip(b"=").decode()


def build_jwks(public_key_pem: str, kid: str) -> dict[str, Any]:
    public_key = load_pem_public_key(public_key_pem.encode())
    if not isinstance(public_key, RSAPublicKey):
        raise TypeError("RS256 JWKS 변환에는 RSA 공개키가 필요합니다.")
    numbers = public_key.public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "use": "sig",
                "alg": "RS256",
                "kid": kid,
                "n": _b64url_uint(numbers.n),
                "e": _b64url_uint(numbers.e),
            }
        ]
    }
