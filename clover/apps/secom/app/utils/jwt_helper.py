"""JWT 발급·검증 헬퍼."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

import jwt

_SECRET = os.getenv("JWT_SECRET", "changeme-in-production")
_ALGORITHM = "HS256"
_ACCESS_TTL = int(os.getenv("JWT_ACCESS_TTL_MINUTES", "60"))
_REFRESH_TTL = int(os.getenv("JWT_REFRESH_TTL_DAYS", "7"))


def create_access_token(user_id: str, email: str, role: str) -> tuple[str, str]:
    """(token, jti) 반환."""
    jti = str(uuid.uuid4())
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": jti,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=_ACCESS_TTL),
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, _SECRET, algorithm=_ALGORITHM), jti


def decode_token(token: str) -> dict:
    return jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
