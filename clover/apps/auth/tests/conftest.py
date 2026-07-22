import base64
import sys
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

_here = Path(__file__).parent

_apps_dir = str(_here.parent.parent)
if _apps_dir not in sys.path:
    sys.path.insert(0, _apps_dir)

_backend_dir = str(_here.parent.parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

_root_dir = str(_here.parent.parent.parent.parent)
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)


@pytest.fixture
def rsa_keys(monkeypatch: pytest.MonkeyPatch) -> tuple[str, str]:
    """테스트용 RS256 키 페어를 생성해 JWT_PRIVATE_KEY/JWT_PUBLIC_KEY 에 주입한다."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()
    public_pem = (
        key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode()
    )
    monkeypatch.setenv(
        "JWT_PRIVATE_KEY", base64.b64encode(private_pem.encode()).decode()
    )
    monkeypatch.setenv("JWT_PUBLIC_KEY", base64.b64encode(public_pem.encode()).decode())
    return private_pem, public_pem
