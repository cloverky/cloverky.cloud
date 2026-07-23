"""인증 게이트웨이 엔트리포인트 — auth.cloverky.cloud 전용.

main.py(비즈니스 API)와 같은 코드베이스를 공유하되 프로세스/컨테이너를 분리한다.
JWT 발급(개인키)은 이 엔트리포인트에서만 일어난다.
"""

import sys
from pathlib import Path

# main.py와 동일한 sys.path 구성 — import는 auth.*, core.* 형태
_BACKEND_ROOT = Path(__file__).resolve().parent
_APPS_DIR = _BACKEND_ROOT / "apps"
_PROJECT_ROOT = _BACKEND_ROOT.parent
for _p in (_PROJECT_ROOT, _BACKEND_ROOT, _APPS_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from auth.adapter.inbound.api.auth_router import auth_router  # noqa: E402

app = FastAPI(
    title="cloverky Auth",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,  # 실서비스: 문서 비노출
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://cloverky.cloud",
        "https://www.cloverky.cloud",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")


@app.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}
