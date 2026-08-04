# 영수증 스캔 → 재고 반영 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재고 관리의 영수증 스캔에서 업로드한 영수증을 인식해, 사용자가 확인·수정한 품목만 재고에 담는다.

**Architecture:** 브라우저가 순서를 잡는다 — `receipts_ledger` 에 파일을 올려 S3 키를 받고, 그 키로 `fridge` 의 신규 `/receipt/scan-key` 를 불러 품목을 얻고, 확인 화면을 거쳐 기존 `POST /api/fridge/inventory` 로 담는다. 두 스포크 사이에 파이썬 import 가 생기지 않아 `star-topology-no-spoke-to-spoke` 계약을 건드리지 않는다. `fridge` 내부는 라우터 → provider → 인터랙터 → 포트 → 어댑터로 배선한다(`clean-arch-inbound-no-outbound` 계약 때문에 라우터가 어댑터를 직접 import 할 수 없다).

**Tech Stack:** FastAPI · SQLAlchemy(이번엔 미사용) · boto3 · google-genai · Next.js 16 · React 19 · shadcn/ui

설계 문서: [`_docs/receipt-to-inventory-design.md`](./receipt-to-inventory-design.md)

## Global Constraints

- **Gemini 모델명을 하드코딩하지 않는다.** `os.getenv("GEMINI_MODEL", "gemini-flash-latest")` 를 쓴다. 현재 `receipt_router.py:12` 의 `_MODEL = "gemini-2.0-flash"` 는 이 키로 쿼터 0 이라 실제로 동작하지 않는다.
- **`boto3` 와 `google.genai` 는 `clover/.venv` 에 설치되어 있지 않다.** 두 패키지는 반드시 **함수 안에서 lazy import** 한다. 모듈 최상단에서 import 하면 단위 테스트가 collection 단계에서 죽는다.
- **프롬프트 문구·`_extract_json` 정규식·아이템 정규화 규칙은 한 글자도 바꾸지 않는다.** 위치만 옮긴다.
- **`fridge` 의 모든 `__init__.py` 는 0바이트를 유지한다.**
- **`app/use_cases` 는 `adapter` 를 import 하지 않는다** (`clean-arch-usecase-no-adapter` 계약).
- **`adapter/inbound` 는 `adapter/outbound` 를 import 하지 않는다** (`clean-arch-inbound-no-outbound` 계약).
- 백엔드 테스트 실행: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests -q`
  `pytest.ini` 의 `testpaths` 가 `apps/titanic/tests` 라 **경로를 반드시 명시**한다.
- 프론트 타입체크: `cd ~/projects/cloverky.cloud/lucky && ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
  `next.config.mjs` 가 `ignoreBuildErrors: true` 라 lint 로는 타입 에러가 안 잡힌다. **기존 baseline 은 12건** — 이보다 늘면 내가 만든 것이다.
- 커밋은 `soyeon` 브랜치에서 한다. 작업이 끝나면 `main` 으로 머지한다.

---

## File Structure

**백엔드 (`clover/apps/fridge/`)**

| 파일 | 책임 |
|------|------|
| `app/dtos/receipt_dto.py` *(수정)* | `ReceiptParseResultDto` 타입 조임, `ReceiptImageRef` 추가 |
| `app/ports/output/receipt_ocr_engine_port.py` *(신규)* | 이미지 바이트 → 구조화 결과 계약 |
| `app/ports/output/receipt_image_reader_port.py` *(신규)* | S3 키 → 이미지 바이트 계약 |
| `app/ports/input/receipt_use_case.py` *(수정)* | `scan_by_key`, `scan_bytes` 추가 |
| `app/use_cases/receipt_interactor.py` *(수정)* | 두 포트를 엮는 오케스트레이션 |
| `adapter/outbound/gemini/receipt_ocr_gateway.py` *(신규)* | 프롬프트·Gemini 호출·JSON 정규화 |
| `adapter/outbound/s3/receipt_image_reader.py` *(신규)* | boto3 `get_object` |
| `dependencies/receipt_provider.py` *(수정)* | 어댑터 2종 조립 |
| `adapter/inbound/api/v1/receipt_router.py` *(수정)* | `/scan` 위임으로 교체, `/scan-key` 추가 |
| `tests/adapter/test_receipt_ocr_normalize.py` *(신규)* | 정규화 순수 로직 |
| `tests/app/use_cases/test_receipt_scan_interactor.py` *(신규)* | 오케스트레이션 |

**프론트 (`lucky/`)**

| 파일 | 책임 |
|------|------|
| `lib/receipt-scan-api.ts` *(신규)* | `scanReceiptByKey` 호출 + 타입 |
| `components/receipt-scan-review.tsx` *(신규)* | 확인 화면 전체 (체크박스·줄 수정·날짜) |
| `components/inventory-feature-page.tsx` *(수정)* | 3단 상태 배선, 옛 문구 제거 |

---

## Task 1: Gemini 모델명 하드코딩 제거

먼저 한다. 이게 안 고쳐지면 뒤의 모든 작업이 동작 확인 불가다.

**Files:**
- Modify: `clover/apps/fridge/adapter/inbound/api/v1/receipt_router.py:12`

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (동작만 바뀜)

- [ ] **Step 1: 현재 값 확인**

Run: `cd ~/projects/cloverky.cloud/clover && grep -n '_MODEL' apps/fridge/adapter/inbound/api/v1/receipt_router.py`
Expected: `12:_MODEL = "gemini-2.0-flash"`

- [ ] **Step 2: 환경변수로 교체**

`receipt_router.py` 상단 import 에 `os` 를 추가하고(이미 있으면 생략), 12행을 바꾼다.

```python
_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
```

- [ ] **Step 3: 라이브 컨테이너의 GEMINI_MODEL 값 확인**

Run: `ssh -p 2222 hi@192.168.0.3 "cd ~/projects/cloverky.cloud/clover && grep -c GEMINI_MODEL .env"`
Expected: `1` 이면 `.env` 에 값이 있는 것. `0` 이면 기본값 `gemini-flash-latest` 가 쓰인다 — 둘 다 정상이다. `gemini-2.0-flash` 로 설정돼 있으면 그 값을 지워야 한다.

- [ ] **Step 4: 커밋**

```bash
git add clover/apps/fridge/adapter/inbound/api/v1/receipt_router.py
git commit -m "fix(fridge): 영수증 OCR 모델명을 GEMINI_MODEL 환경변수로

gemini-2.0-flash 는 이 키로 쿼터가 0이라 /receipt/scan 이 실제로는
동작하지 않았다. admin 의 chat_gateway 와 같은 방식으로 맞춘다."
```

---

## Task 2: OCR 포트와 정규화 로직 분리

**Files:**
- Modify: `clover/apps/fridge/app/dtos/receipt_dto.py`
- Create: `clover/apps/fridge/app/ports/output/receipt_ocr_engine_port.py`
- Create: `clover/apps/fridge/adapter/outbound/gemini/__init__.py` (0바이트)
- Create: `clover/apps/fridge/adapter/outbound/gemini/receipt_ocr_gateway.py`
- Test: `clover/apps/fridge/tests/adapter/test_receipt_ocr_normalize.py`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `ReceiptLineParsedDto(name: str, quantity: int, unit: str)` — 이미 존재, 그대로 사용
  - `ReceiptParseResultDto(store_name: str | None, purchased_date: str | None, items: list[ReceiptLineParsedDto])`
  - `ReceiptOcrEnginePort.extract(image_bytes: bytes, mime_type: str) -> ReceiptParseResultDto`
  - `normalize_scan_payload(parsed: dict) -> ReceiptParseResultDto` — 모듈 레벨 순수 함수
  - `extract_json_block(text: str) -> dict` — 모듈 레벨 순수 함수

- [ ] **Step 1: 실패하는 테스트 작성**

`clover/apps/fridge/tests/adapter/test_receipt_ocr_normalize.py`

```python
"""완료 기준: Gemini 응답 문자열이 DTO로 정규화되는지 — 네트워크 없이."""

from __future__ import annotations

import pytest

from fridge.adapter.outbound.gemini.receipt_ocr_gateway import (
    extract_json_block,
    normalize_scan_payload,
)


def test_json_fence_is_stripped() -> None:
    """```json 펜스로 감싸여 와도 본문만 뽑는다."""
    raw = '```json\n{"store_name": "OO마트", "items": []}\n```'

    assert extract_json_block(raw)["store_name"] == "OO마트"


def test_bare_json_without_fence() -> None:
    """펜스가 없어도 첫 { 부터 마지막 } 까지를 읽는다."""
    raw = '설명이 앞에 붙어도 {"store_name": null, "items": []} 뒤에도 붙음'

    assert extract_json_block(raw)["store_name"] is None


def test_missing_json_raises() -> None:
    """JSON 블록이 없으면 ValueError."""
    with pytest.raises(ValueError):
        extract_json_block("아무 JSON도 없는 문장")


def test_items_are_normalized() -> None:
    """수량은 1 이상 정수로, 단위는 비면 '개'로 채운다."""
    result = normalize_scan_payload(
        {
            "store_name": "OO마트",
            "purchased_date": "2026-08-04",
            "items": [
                {"name": "사과", "quantity": 3, "unit": "개"},
                {"name": "우유", "quantity": 0, "unit": ""},
                {"name": "달걀", "quantity": "여섯", "unit": "판"},
            ],
        }
    )

    assert result.store_name == "OO마트"
    assert result.purchased_date == "2026-08-04"
    assert [(i.name, i.quantity, i.unit) for i in result.items] == [
        ("사과", 3, "개"),
        ("우유", 1, "개"),
        ("달걀", 1, "판"),
    ]


def test_nameless_and_malformed_rows_are_dropped() -> None:
    """이름이 없는 줄과 dict 가 아닌 줄은 버린다."""
    result = normalize_scan_payload(
        {"items": [{"name": "  "}, "문자열", {"name": "두부", "quantity": 2, "unit": "모"}]}
    )

    assert [(i.name, i.quantity, i.unit) for i in result.items] == [("두부", 2, "모")]


def test_null_store_and_date_become_none() -> None:
    """모델이 문자열 'null' 을 뱉어도 None 으로 본다."""
    result = normalize_scan_payload(
        {"store_name": "null", "purchased_date": "null", "items": []}
    )

    assert result.store_name is None
    assert result.purchased_date is None


def test_unparseable_date_becomes_none() -> None:
    """날짜 형식이 깨지면 None — 전체를 실패시키지 않는다."""
    result = normalize_scan_payload({"purchased_date": "2026년 8월", "items": []})

    assert result.purchased_date is None
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests/adapter/test_receipt_ocr_normalize.py -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'fridge.adapter.outbound.gemini'`

- [ ] **Step 3: DTO 타입 조이기**

`clover/apps/fridge/app/dtos/receipt_dto.py` 의 `ReceiptParseResultDto` 를 교체한다. `ReceiptQuery`·`ReceiptUploadResponse`·`ReceiptLineParsedDto` 는 그대로 둔다.

```python
@dataclass(frozen=True)
class ReceiptParseResultDto:
    store_name: str | None
    purchased_date: str | None  # ISO "YYYY-MM-DD"
    items: list[ReceiptLineParsedDto]
```

파일 맨 위 import 에 `from __future__ import annotations` 가 없으면 첫 줄에 추가한다.

- [ ] **Step 4: 포트 정의**

`clover/apps/fridge/app/ports/output/receipt_ocr_engine_port.py`

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.receipt_dto import ReceiptParseResultDto


class ReceiptOcrEnginePort(ABC):
    """영수증 이미지에서 구조화된 구매 정보를 뽑는다."""

    @abstractmethod
    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        """실패 시 ValueError — 인터랙터가 사용자 노출 메시지로 바꾼다."""
```

- [ ] **Step 5: 게이트웨이 구현**

`clover/apps/fridge/adapter/outbound/gemini/__init__.py` 를 0바이트로 만든다.

`clover/apps/fridge/adapter/outbound/gemini/receipt_ocr_gateway.py`

프롬프트와 정규식은 `receipt_router.py` 에서 그대로 가져온다. **`google.genai` 와 keymaker 는 `extract()` 안에서 lazy import** 한다 — venv 에 없어서 최상단 import 면 테스트가 죽는다.

```python
from __future__ import annotations

import json
import os
import re
from datetime import date

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptLineParsedDto,
    ReceiptParseResultDto,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)

_PROMPT = """이 영수증 이미지에서 구매 정보를 추출하세요.
반드시 아래 JSON 형식만 출력하고 다른 설명은 하지 마세요.
{
  "store_name": "매장명 또는 null",
  "purchased_date": "YYYY-MM-DD 또는 null",
  "items": [
    {"name": "품목명", "quantity": 1, "unit": "개"}
  ]
}
quantity는 1 이상 정수, unit은 개·팩·봉·통·g·ml 중 하나. 읽을 수 없는 품목은 제외."""


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-flash-latest")


def extract_json_block(text: str) -> dict:
    """모델 응답에서 JSON 객체만 뽑는다. 없으면 ValueError."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("JSON 블록을 찾을 수 없습니다.")
    return json.loads(text[start : end + 1])


def _clean_optional(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return None if text in ("", "null") else text


def normalize_scan_payload(parsed: dict) -> ReceiptParseResultDto:
    """모델이 뱉은 dict 를 DTO 로 정규화한다. 깨진 줄은 버리고 전체는 살린다."""
    items: list[ReceiptLineParsedDto] = []
    for row in parsed.get("items") or []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        try:
            qty = max(1, int(row.get("quantity") or 1))
        except (TypeError, ValueError):
            qty = 1
        unit = str(row.get("unit") or "개").strip() or "개"
        items.append(ReceiptLineParsedDto(name=name, quantity=qty, unit=unit))

    purchased_date = None
    raw_date = _clean_optional(parsed.get("purchased_date"))
    if raw_date:
        try:
            purchased_date = date.fromisoformat(raw_date[:10]).isoformat()
        except ValueError:
            purchased_date = None

    return ReceiptParseResultDto(
        store_name=_clean_optional(parsed.get("store_name")),
        purchased_date=purchased_date,
        items=items,
    )


class ReceiptOcrGateway(ReceiptOcrEnginePort):
    """Gemini Vision 으로 이미지에서 곧바로 구조화 JSON 을 받는다."""

    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        # google.genai 는 venv 에 없을 수 있다 — 호출 시점에만 필요하다.
        from google.genai import types as genai_types

        from core.matrix.wault_keymaker_serect_manager import get_keymaker

        keymaker = get_keymaker()
        if not keymaker.is_gemini_ready():
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

        client = keymaker.get_gemini_client()
        try:
            response = await client.aio.models.generate_content(
                model=_model_name(),
                contents=[
                    genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    _PROMPT,
                ],
            )
            raw = (response.text or "").strip()
        except Exception as e:
            raise ValueError(f"영수증 인식 실패: {e!s}") from e

        if not raw:
            raise ValueError("영수증에서 텍스트를 읽지 못했습니다.")

        return normalize_scan_payload(extract_json_block(raw))
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests/adapter/test_receipt_ocr_normalize.py -q`
Expected: `7 passed`

- [ ] **Step 7: 커밋**

```bash
git add clover/apps/fridge/app/dtos/receipt_dto.py \
        clover/apps/fridge/app/ports/output/receipt_ocr_engine_port.py \
        clover/apps/fridge/adapter/outbound/gemini/ \
        clover/apps/fridge/tests/adapter/test_receipt_ocr_normalize.py
git commit -m "feat(fridge): 영수증 OCR 게이트웨이 분리

라우터에 인라인으로 있던 프롬프트·JSON 파싱을 포트/어댑터로 옮긴다.
로직은 그대로다 — 위치만 바뀐다. google.genai 는 venv 에 없어서
호출 시점에 lazy import 한다."
```

---

## Task 3: S3 이미지 리더

**Files:**
- Create: `clover/apps/fridge/app/ports/output/receipt_image_reader_port.py`
- Create: `clover/apps/fridge/adapter/outbound/s3/__init__.py` (0바이트)
- Create: `clover/apps/fridge/adapter/outbound/s3/receipt_image_reader.py`

**Interfaces:**
- Consumes: 없음
- Produces: `ReceiptImageReaderPort.read(bucket: str, key: str) -> tuple[bytes, str]` — `(이미지 바이트, content_type)`

- [ ] **Step 1: 포트 정의**

`clover/apps/fridge/app/ports/output/receipt_image_reader_port.py`

```python
from __future__ import annotations

from abc import ABC, abstractmethod


class ReceiptImageReaderPort(ABC):
    """S3 에 올라간 영수증 이미지를 읽어온다."""

    @abstractmethod
    async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
        """(이미지 바이트, content_type) 반환. 없으면 FileNotFoundError."""
```

- [ ] **Step 2: 어댑터 구현**

`clover/apps/fridge/adapter/outbound/s3/__init__.py` 를 0바이트로 만든다.

`clover/apps/fridge/adapter/outbound/s3/receipt_image_reader.py`

`boto3` 도 venv 에 없으므로 lazy import 한다. boto3 는 동기 API 라 스레드로 넘겨 이벤트 루프를 막지 않는다.

```python
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
```

- [ ] **Step 3: import 가 깨지지 않는지 확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/python -c "from fridge.adapter.outbound.s3.receipt_image_reader import S3ReceiptImageReader; print('ok')"`
Expected: `ok` — boto3 가 없어도 최상단 import 가 없으므로 통과해야 한다.

- [ ] **Step 4: 커밋**

```bash
git add clover/apps/fridge/app/ports/output/receipt_image_reader_port.py \
        clover/apps/fridge/adapter/outbound/s3/
git commit -m "feat(fridge): S3 영수증 이미지 리더 추가

boto3 는 동기 API 라 asyncio.to_thread 로 넘긴다.
venv 에 boto3 가 없어 최상단 import 는 피한다."
```

---

## Task 4: 인터랙터 오케스트레이션

**Files:**
- Modify: `clover/apps/fridge/app/ports/input/receipt_use_case.py`
- Modify: `clover/apps/fridge/app/use_cases/receipt_interactor.py`
- Test: `clover/apps/fridge/tests/app/use_cases/test_receipt_scan_interactor.py`

**Interfaces:**
- Consumes: `ReceiptOcrEnginePort.extract`, `ReceiptImageReaderPort.read`, `ReceiptParseResultDto`
- Produces:
  - `ReceiptUseCase.scan_bytes(image_bytes: bytes, mime_type: str) -> ReceiptParseResultDto`
  - `ReceiptUseCase.scan_by_key(bucket: str, key: str) -> ReceiptParseResultDto`
  - `ReceiptInteractor(repository, ocr_engine, image_reader)` — 생성자 인자 3개

- [ ] **Step 1: 실패하는 테스트 작성**

`clover/apps/fridge/tests/app/use_cases/test_receipt_scan_interactor.py`

```python
"""완료 기준: 인터랙터가 S3 → OCR 순서를 지키는지 — 네트워크 없이."""

from __future__ import annotations

import pytest

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptLineParsedDto,
    ReceiptParseResultDto,
)
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.use_cases.receipt_interactor import ReceiptInteractor

PARSED = ReceiptParseResultDto(
    store_name="OO마트",
    purchased_date="2026-08-04",
    items=[ReceiptLineParsedDto(name="사과", quantity=3, unit="개")],
)


class FakeReader(ReceiptImageReaderPort):
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
        self.calls.append((bucket, key))
        return b"IMAGEBYTES", "image/png"


class FakeOcr(ReceiptOcrEnginePort):
    def __init__(self) -> None:
        self.calls: list[tuple[bytes, str]] = []

    async def extract(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        self.calls.append((image_bytes, mime_type))
        return PARSED


def _interactor(reader: ReceiptImageReaderPort, ocr: ReceiptOcrEnginePort):
    return ReceiptInteractor(repository=None, ocr_engine=ocr, image_reader=reader)


async def test_scan_by_key_reads_then_extracts() -> None:
    """S3 에서 읽은 바이트와 content_type 을 그대로 OCR 에 넘긴다."""
    reader, ocr = FakeReader(), FakeOcr()

    result = await _interactor(reader, ocr).scan_by_key("my-bucket", "receipts/a.png")

    assert reader.calls == [("my-bucket", "receipts/a.png")]
    assert ocr.calls == [(b"IMAGEBYTES", "image/png")]
    assert result.items[0].name == "사과"


async def test_scan_bytes_skips_s3() -> None:
    """파일을 직접 받은 경우 S3 를 건드리지 않는다."""
    reader, ocr = FakeReader(), FakeOcr()

    result = await _interactor(reader, ocr).scan_bytes(b"DIRECT", "image/webp")

    assert reader.calls == []
    assert ocr.calls == [(b"DIRECT", "image/webp")]
    assert result.store_name == "OO마트"


async def test_missing_image_propagates() -> None:
    """S3 에 없으면 FileNotFoundError 가 그대로 올라가고 OCR 은 안 부른다."""

    class Missing(ReceiptImageReaderPort):
        async def read(self, bucket: str, key: str) -> tuple[bytes, str]:
            raise FileNotFoundError("없음")

    ocr = FakeOcr()

    with pytest.raises(FileNotFoundError):
        await _interactor(Missing(), ocr).scan_by_key("b", "k")

    assert ocr.calls == []
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests/app/use_cases/test_receipt_scan_interactor.py -q`
Expected: FAIL — `TypeError: ReceiptInteractor.__init__() got an unexpected keyword argument 'ocr_engine'`

- [ ] **Step 3: 입력 포트 확장**

`clover/apps/fridge/app/ports/input/receipt_use_case.py` 를 통째로 교체한다.

```python
from __future__ import annotations

from abc import ABC, abstractmethod

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptParseResultDto,
    ReceiptUploadResponse,
)
from fridge.adapter.inbound.api.schemas.receipt_schema import ReceiptUploadSchema


class ReceiptUseCase(ABC):
    @abstractmethod
    async def get_status(self, schema: ReceiptUploadSchema) -> ReceiptUploadResponse:
        pass

    @abstractmethod
    async def scan_bytes(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        """업로드된 파일을 그대로 인식한다."""

    @abstractmethod
    async def scan_by_key(self, bucket: str, key: str) -> ReceiptParseResultDto:
        """S3 에 이미 올라간 이미지를 키로 읽어 인식한다."""
```

- [ ] **Step 4: 인터랙터 구현**

`clover/apps/fridge/app/use_cases/receipt_interactor.py` 를 통째로 교체한다.

```python
from __future__ import annotations

from clover.apps.fridge.app.dtos.receipt_dto import (
    ReceiptParseResultDto,
    ReceiptQuery,
    ReceiptUploadResponse,
)
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.ports.output.receipt_repository import ReceiptRepository
from fridge.adapter.inbound.api.schemas.receipt_schema import ReceiptUploadSchema


class ReceiptInteractor(ReceiptUseCase):
    def __init__(
        self,
        repository: ReceiptRepository,
        ocr_engine: ReceiptOcrEnginePort,
        image_reader: ReceiptImageReaderPort,
    ) -> None:
        self.repository = repository
        self.ocr_engine = ocr_engine
        self.image_reader = image_reader

    async def get_status(self, schema: ReceiptUploadSchema) -> ReceiptUploadResponse:
        return await self.repository.get_status(
            ReceiptQuery(
                user_id=schema.user_id,
                status=schema.status,
            )
        )

    async def scan_bytes(
        self, image_bytes: bytes, mime_type: str
    ) -> ReceiptParseResultDto:
        return await self.ocr_engine.extract(image_bytes, mime_type)

    async def scan_by_key(self, bucket: str, key: str) -> ReceiptParseResultDto:
        image_bytes, content_type = await self.image_reader.read(bucket, key)
        return await self.ocr_engine.extract(image_bytes, content_type)
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests -q`
Expected: `10 passed` (기존 7 + 신규 3). Task 2 의 테스트까지 포함하면 `17 passed`.

- [ ] **Step 6: 커밋**

```bash
git add clover/apps/fridge/app/ports/input/receipt_use_case.py \
        clover/apps/fridge/app/use_cases/receipt_interactor.py \
        clover/apps/fridge/tests/app/use_cases/test_receipt_scan_interactor.py
git commit -m "feat(fridge): 영수증 인식 오케스트레이션 추가

scan_by_key 는 S3 에서 읽어 OCR 로 넘기고, scan_bytes 는 S3 를 건너뛴다.
use_cases 는 포트만 의존한다."
```

---

## Task 5: 라우터 배선과 `/scan-key` 엔드포인트

**Files:**
- Modify: `clover/apps/fridge/dependencies/receipt_provider.py`
- Modify: `clover/apps/fridge/adapter/inbound/api/v1/receipt_router.py`

**Interfaces:**
- Consumes: `ReceiptUseCase.scan_bytes`, `ReceiptUseCase.scan_by_key`, `get_receipt_use_case`
- Produces:
  - `POST /api/fridge/receipt/scan` — multipart `image`, 응답 `ReceiptScanResponse`
  - `POST /api/fridge/receipt/scan-key` — JSON `{s3_bucket, s3_key}`, 응답 `ReceiptScanResponse`
  - `ReceiptScanResponse{store_name: str|None, purchased_date: str|None, items: [{name, quantity, unit}]}`

- [ ] **Step 1: provider 에 어댑터 조립**

`clover/apps/fridge/dependencies/receipt_provider.py` 를 통째로 교체한다.

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from clover.apps.fridge.adapter.outbound.gemini.receipt_ocr_gateway import (
    ReceiptOcrGateway,
)
from clover.apps.fridge.adapter.outbound.repositories.receipt_pg_repository import (
    ReceiptPgRepository,
)
from clover.apps.fridge.adapter.outbound.s3.receipt_image_reader import (
    S3ReceiptImageReader,
)
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.app.ports.output.receipt_image_reader_port import (
    ReceiptImageReaderPort,
)
from clover.apps.fridge.app.ports.output.receipt_ocr_engine_port import (
    ReceiptOcrEnginePort,
)
from clover.apps.fridge.app.ports.output.receipt_repository import ReceiptRepository
from clover.apps.fridge.app.use_cases.receipt_interactor import ReceiptInteractor
from clover.core.matrix.grid_oracle_database_manager import get_db


def get_receipt_repository(db: AsyncSession = Depends(get_db)) -> ReceiptPgRepository:
    return ReceiptPgRepository(session=db)


def get_receipt_ocr_engine() -> ReceiptOcrEnginePort:
    return ReceiptOcrGateway()


def get_receipt_image_reader() -> ReceiptImageReaderPort:
    return S3ReceiptImageReader()


def get_receipt_use_case(
    repository: ReceiptRepository = Depends(get_receipt_repository),
    ocr_engine: ReceiptOcrEnginePort = Depends(get_receipt_ocr_engine),
    image_reader: ReceiptImageReaderPort = Depends(get_receipt_image_reader),
) -> ReceiptUseCase:
    return ReceiptInteractor(
        repository=repository,
        ocr_engine=ocr_engine,
        image_reader=image_reader,
    )
```

- [ ] **Step 2: 라우터 교체**

`clover/apps/fridge/adapter/inbound/api/v1/receipt_router.py` 를 통째로 교체한다. 프롬프트·정규식은 Task 2 에서 게이트웨이로 옮겼으므로 여기서 전부 사라진다.

```python
from __future__ import annotations

from clover.apps.fridge.app.dtos.receipt_dto import ReceiptParseResultDto
from clover.apps.fridge.app.ports.input.receipt_use_case import ReceiptUseCase
from clover.apps.fridge.dependencies.receipt_provider import get_receipt_use_case
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

receipt_router = APIRouter(prefix="/receipt", tags=["receipt"])

_ALLOWED = {"image/jpeg", "image/png", "image/webp", "image/heic"}
_MAX_BYTES = 10 * 1024 * 1024


class ParsedItem(BaseModel):
    name: str
    quantity: int
    unit: str


class ReceiptScanResponse(BaseModel):
    store_name: str | None
    purchased_date: str | None
    items: list[ParsedItem]


class ScanByKeyRequest(BaseModel):
    s3_bucket: str
    s3_key: str


def _to_response(result: ReceiptParseResultDto) -> ReceiptScanResponse:
    return ReceiptScanResponse(
        store_name=result.store_name,
        purchased_date=result.purchased_date,
        items=[
            ParsedItem(name=i.name, quantity=i.quantity, unit=i.unit)
            for i in result.items
        ],
    )


@receipt_router.post("/scan", response_model=ReceiptScanResponse)
async def scan_receipt(
    image: UploadFile = File(...),
    use_case: ReceiptUseCase = Depends(get_receipt_use_case),
) -> ReceiptScanResponse:
    mime = image.content_type or "image/jpeg"
    if mime not in _ALLOWED:
        raise HTTPException(status_code=415, detail=f"지원하지 않는 이미지 형식: {mime}")

    data = await image.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="이미지 크기는 10MB 이하여야 합니다.")

    try:
        result = await use_case.scan_bytes(data, mime)
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return _to_response(result)


@receipt_router.post("/scan-key", response_model=ReceiptScanResponse)
async def scan_receipt_by_key(
    body: ScanByKeyRequest,
    use_case: ReceiptUseCase = Depends(get_receipt_use_case),
) -> ReceiptScanResponse:
    """이미 S3 에 올라간 영수증을 키로 읽어 인식한다 — 파일을 두 번 올리지 않기 위함."""
    try:
        result = await use_case.scan_by_key(body.s3_bucket, body.s3_key)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    return _to_response(result)
```

- [ ] **Step 3: 라우터가 로드되는지 확인**

`fridge_router.py` 는 하위 라우터 로드 실패를 `logger.warning` 으로 삼킨다. import 에러가 있으면 서버는 뜨고 라우터만 조용히 사라지므로 반드시 직접 확인한다.

Run:
```bash
cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/python -c "
from fridge.adapter.inbound.api.fridge_router import fridge_router
paths = sorted({r.path for r in fridge_router.routes})
print([p for p in paths if 'receipt' in p])
"
```
Expected: `['/api/fridge/receipt/scan', '/api/fridge/receipt/scan-key', ...]` — `scan-key` 가 보여야 한다. 안 보이면 import 에러다.

- [ ] **Step 4: 전체 테스트 재확인**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests -q`
Expected: `17 passed`

- [ ] **Step 5: 커밋**

```bash
git add clover/apps/fridge/dependencies/receipt_provider.py \
        clover/apps/fridge/adapter/inbound/api/v1/receipt_router.py
git commit -m "feat(fridge): POST /receipt/scan-key 추가

S3 키로 인식해서 같은 파일을 두 번 올리지 않게 한다.
라우터는 provider 경유로 얇아졌다 — inbound 가 outbound 를
직접 import 하지 않는다."
```

---

## Task 6: 프론트 API 클라이언트

**Files:**
- Create: `lucky/lib/receipt-scan-api.ts`

**Interfaces:**
- Consumes: `notifySessionExpired`, `refreshAccessToken` (`lib/auth-session.ts`)
- Produces:
  - `type ScannedItem = { name: string; quantity: number; unit: string }`
  - `type ReceiptScanResult = { store_name: string | null; purchased_date: string | null; items: ScannedItem[] }`
  - `scanReceiptByKey(email: string, bucket: string, key: string): Promise<ReceiptScanResult>`

- [ ] **Step 1: 파일 생성**

`lucky/lib/receipt-scan-api.ts`

인식은 오래 걸리므로 60초 타임아웃을 건다. 401 은 기존 single-flight 갱신을 재사용한다 — 새 갱신 로직을 만들지 않는다.

```typescript
import { notifySessionExpired, refreshAccessToken } from "@/lib/auth-session";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

/** Gemini 인식은 수 초가 걸린다. Cloudflare 100초 한도 안쪽으로 잡는다. */
const SCAN_TIMEOUT_MS = 60_000;

type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

export type ScannedItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type ReceiptScanResult = {
  store_name: string | null;
  purchased_date: string | null;
  items: ScannedItem[];
};

export async function scanReceiptByKey(
  email: string,
  bucket: string,
  key: string,
): Promise<ReceiptScanResult> {
  const send = () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    return fetch(`${API_BASE}/api/fridge/receipt/scan-key`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": email,
      },
      body: JSON.stringify({ s3_bucket: bucket, s3_key: key }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  };

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && (await refreshAccessToken())) {
      res = await send();
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("영수증 인식이 너무 오래 걸립니다. 다시 시도해 주세요.");
    }
    throw new Error("백엔드 서버에 연결할 수 없습니다.");
  }

  if (res.status === 401) {
    notifySessionExpired();
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const data = (await res.json()) as ReceiptScanResult & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ~/projects/cloverky.cloud/lucky && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | tail -20`
Expected: 에러 12건 — baseline 과 동일. 13건 이상이면 이 파일이 원인이다.

- [ ] **Step 3: 커밋**

```bash
git add lucky/lib/receipt-scan-api.ts
git commit -m "feat(lucky): 영수증 인식 API 클라이언트 추가

S3 키로 인식을 요청한다. 401 은 auth-session 의 single-flight
갱신을 그대로 재사용한다."
```

---

## Task 7: 확인 화면 컴포넌트

**Files:**
- Create: `lucky/components/receipt-scan-review.tsx`

**Interfaces:**
- Consumes: `ScannedItem`, `ReceiptScanResult`, `INVENTORY_UNITS`, `INVENTORY_STORAGE`, `fetchExpiryEstimate`, `InventoryItemPayload`
- Produces:
  - `type ReviewRow` — 내부 전용
  - `<ReceiptScanReview result={...} storeName={...} onCancel={...} onConfirm={(payloads) => Promise<void>} submitting={boolean} />`
  - `onConfirm` 이 받는 타입: `InventoryItemPayload[]`

- [ ] **Step 1: 컴포넌트 작성**

`lucky/components/receipt-scan-review.tsx`

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Loader2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVENTORY_STORAGE,
  INVENTORY_UNITS,
  fetchExpiryEstimate,
  type InventoryItemPayload,
} from "@/lib/inventory-api";
import type { ReceiptScanResult } from "@/lib/receipt-scan-api";

type DateMode = "purchase" | "expiry";

type ReviewRow = {
  id: number;
  checked: boolean;
  name: string;
  quantity: number;
  unit: string;
  storage: string;
  /** null 이면 영수증 단위 날짜를 따른다. */
  ownDate: { mode: DateMode; purchasedDate: string; expiryDate: string } | null;
  estimatedExpiry: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  result: ReceiptScanResult;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (payloads: InventoryItemPayload[]) => Promise<void>;
};

export function ReceiptScanReview({ result, submitting, onCancel, onConfirm }: Props) {
  const [receiptMode, setReceiptMode] = useState<DateMode>("purchase");
  const [receiptPurchased, setReceiptPurchased] = useState(
    result.purchased_date ?? todayIso(),
  );
  const [receiptExpiry, setReceiptExpiry] = useState(todayIso());
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    result.items.map((item, i) => ({
      id: i,
      checked: true,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      storage: "냉장",
      ownDate: null,
      estimatedExpiry: null,
    })),
  );

  const patchRow = useCallback(
    (id: number, patch: Partial<ReviewRow>) =>
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [],
  );

  // 품목명·보관위치·구매일이 바뀌면 그 줄의 유통기한을 다시 추정한다.
  // 유통기한을 직접 받은 줄은 추정이 필요 없다.
  useEffect(() => {
    const timer = setTimeout(() => {
      rows.forEach((row) => {
        const mode = row.ownDate?.mode ?? receiptMode;
        if (mode !== "purchase" || !row.name.trim()) return;
        const purchased = row.ownDate?.purchasedDate ?? receiptPurchased;
        void fetchExpiryEstimate(row.name.trim(), purchased, row.storage)
          .then((r) => patchRow(row.id, { estimatedExpiry: r.estimated_expiry_date }))
          .catch(() => patchRow(row.id, { estimatedExpiry: null }));
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [rows, receiptMode, receiptPurchased, patchRow]);

  const checkedCount = rows.filter((r) => r.checked).length;
  const allChecked = rows.length > 0 && checkedCount === rows.length;

  const toPayloads = (): InventoryItemPayload[] =>
    rows
      .filter((r) => r.checked && r.name.trim())
      .map((r) => {
        const mode = r.ownDate?.mode ?? receiptMode;
        const purchased = r.ownDate?.purchasedDate ?? receiptPurchased;
        const expiry = r.ownDate?.expiryDate ?? receiptExpiry;
        return {
          name: r.name.trim(),
          quantity: r.quantity,
          unit: r.unit,
          storage: r.storage,
          purchased_date: mode === "purchase" ? purchased : null,
          expiry_date: mode === "expiry" ? expiry : null,
        };
      });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-text">
          업로드 완료 — 영수증에서 {result.items.length}개를 찾았어요. 담을 것만 골라주세요.
          {result.store_name ? (
            <span className="ml-2 text-muted-foreground">· {result.store_name}</span>
          ) : null}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => prev.map((r) => ({ ...r, checked: !allChecked })))
          }
        >
          {allChecked ? "전체 해제" : "전체 선택"}
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <Label>날짜</Label>
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <Button
            type="button"
            variant={receiptMode === "purchase" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1 text-xs sm:text-sm"
            onClick={() => setReceiptMode("purchase")}
          >
            구매일만 알아요
          </Button>
          <Button
            type="button"
            variant={receiptMode === "expiry" ? "default" : "outline"}
            size="sm"
            className="h-9 flex-1 text-xs sm:text-sm"
            onClick={() => setReceiptMode("expiry")}
          >
            유통기한 알아요
          </Button>
        </div>
        {receiptMode === "purchase" ? (
          <>
            <Input
              type="date"
              value={receiptPurchased}
              onChange={(e) => setReceiptPurchased(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              품목·보관 기준으로 유통기한을 추정합니다.
            </p>
          </>
        ) : (
          <Input
            type="date"
            value={receiptExpiry}
            onChange={(e) => setReceiptExpiry(e.target.value)}
          />
        )}
      </div>

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox
                checked={row.checked}
                onCheckedChange={(v) => patchRow(row.id, { checked: v === true })}
                aria-label={`${row.name} 담기`}
              />
              <Input
                value={row.name}
                onChange={(e) => patchRow(row.id, { name: e.target.value })}
                className="h-9 w-32 flex-1 min-w-28"
                aria-label="품목명"
              />
              <Input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(e) =>
                  patchRow(row.id, { quantity: Math.max(1, Number(e.target.value) || 1) })
                }
                className="h-9 w-16"
                aria-label="수량"
              />
              <Select
                value={row.unit}
                onValueChange={(v) => patchRow(row.id, { unit: v })}
              >
                <SelectTrigger className="h-9 w-20" aria-label="단위">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={row.storage}
                onValueChange={(v) => patchRow(row.id, { storage: v })}
              >
                <SelectTrigger className="h-9 w-24" aria-label="보관">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_STORAGE.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {row.estimatedExpiry && !row.ownDate ? (
                <span className="text-xs text-muted-foreground">
                  ~{row.estimatedExpiry}
                </span>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs"
                onClick={() =>
                  patchRow(row.id, {
                    ownDate: row.ownDate
                      ? null
                      : {
                          mode: receiptMode,
                          purchasedDate: receiptPurchased,
                          expiryDate: receiptExpiry,
                        },
                  })
                }
              >
                <CalendarClock className="mr-1 h-3.5 w-3.5" />
                {row.ownDate ? "날짜 되돌리기" : "날짜 따로"}
              </Button>
            </div>

            {row.ownDate ? (
              <div className="mt-3 space-y-2 rounded-md bg-muted/50 p-3">
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant={row.ownDate.mode === "purchase" ? "default" : "outline"}
                    size="sm"
                    className="h-8 flex-1 text-xs"
                    onClick={() =>
                      patchRow(row.id, {
                        ownDate: { ...row.ownDate!, mode: "purchase" },
                      })
                    }
                  >
                    구매일만 알아요
                  </Button>
                  <Button
                    type="button"
                    variant={row.ownDate.mode === "expiry" ? "default" : "outline"}
                    size="sm"
                    className="h-8 flex-1 text-xs"
                    onClick={() =>
                      patchRow(row.id, { ownDate: { ...row.ownDate!, mode: "expiry" } })
                    }
                  >
                    유통기한 알아요
                  </Button>
                </div>
                <Input
                  type="date"
                  value={
                    row.ownDate.mode === "purchase"
                      ? row.ownDate.purchasedDate
                      : row.ownDate.expiryDate
                  }
                  onChange={(e) =>
                    patchRow(row.id, {
                      ownDate:
                        row.ownDate!.mode === "purchase"
                          ? { ...row.ownDate!, purchasedDate: e.target.value }
                          : { ...row.ownDate!, expiryDate: e.target.value },
                    })
                  }
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          취소
        </Button>
        <Button
          type="button"
          disabled={submitting || checkedCount === 0}
          onClick={() => void onConfirm(toPayloads())}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PackagePlus className="mr-2 h-4 w-4" />
          )}
          {rows.length}개 중 {checkedCount}개 재고에 담기
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `cd ~/projects/cloverky.cloud/lucky && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | tail -20`
Expected: 에러 12건 (baseline). `InventoryItemPayload` 는 `name·quantity·unit·storage` 가 필수이고 `expiry_date`·`purchased_date`·`min_quantity` 가 선택이다 — `toPayloads` 의 반환이 여기에 맞는지 타입체크가 확인해 준다.

- [ ] **Step 3: 커밋**

```bash
git add lucky/components/receipt-scan-review.tsx
git commit -m "feat(lucky): 영수증 인식 결과 확인 화면

날짜는 영수증 단위로 한 번 받고, 줄별로 따로 지정할 수 있게 한다.
보관위치를 바꾸면 그 줄의 유통기한을 다시 추정한다."
```

---

## Task 8: 재고 화면 배선과 옛 문구 제거

**Files:**
- Modify: `lucky/components/inventory-feature-page.tsx`

**Interfaces:**
- Consumes: `scanReceiptByKey`, `ReceiptScanReview`, `uploadReceiptImage`, `createInventoryItem`
- Produces: 없음 (최종 소비자)

- [ ] **Step 1: import 추가**

`lucky/components/inventory-feature-page.tsx` 의 import 블록에 추가한다.

```typescript
import { ReceiptScanReview } from "@/components/receipt-scan-review";
import { scanReceiptByKey, type ReceiptScanResult } from "@/lib/receipt-scan-api";
```

`@/lib/inventory-api` 의 import 목록에 `type InventoryItemPayload` 를 추가한다.

- [ ] **Step 2: 상태 교체**

148-151행의 세 상태를 아래로 바꾼다. `ReceiptImageUploadResult` import 는 더 이상 쓰이지 않으면 지운다.

```typescript
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptBusy, setReceiptBusy] = useState<"idle" | "uploading" | "scanning" | "saving">("idle");
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<{ bucket: string; key: string } | null>(null);
```

- [ ] **Step 3: 업로드 핸들러 교체**

243-257행의 `handleUploadReceipt` 를 아래 세 함수로 바꾼다.

```typescript
  const runScan = async (email: string, bucket: string, key: string) => {
    setReceiptBusy("scanning");
    setScanError(null);
    try {
      const scanned = await scanReceiptByKey(email, bucket, key);
      setScanResult(scanned);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "영수증을 읽지 못했어요.");
    } finally {
      setReceiptBusy("idle");
    }
  };

  const handleUploadReceipt = async (file: File) => {
    const email = user?.email;
    if (!email) {
      openLogin();
      return;
    }
    setReceiptFile(file);
    setScanResult(null);
    setScanError(null);
    setReceiptBusy("uploading");
    let uploaded;
    try {
      uploaded = await uploadReceiptImage(email, file);
    } catch (err) {
      setReceiptBusy("idle");
      toast.error(err instanceof Error ? err.message : "영수증 업로드에 실패했습니다.");
      return;
    }
    setLastUpload({ bucket: uploaded.s3_bucket, key: uploaded.s3_key });
    await runScan(email, uploaded.s3_bucket, uploaded.s3_key);
  };

  const handleConfirmScanned = async (payloads: InventoryItemPayload[]) => {
    const email = user?.email;
    if (!email) return;
    setReceiptBusy("saving");
    const results = await Promise.allSettled(
      payloads.map((p) => createInventoryItem(email, p)),
    );
    const saved = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - saved;
    setReceiptBusy("idle");

    if (saved > 0) {
      toast.success(`내 냉장고 속으로 들어갔어요! ${saved}개를 재고에 담았습니다.`);
      setScanResult(null);
      setReceiptFile(null);
      setLastUpload(null);
      await load();
    }
    if (failed > 0) {
      toast.error(`${failed}개는 담지 못했어요. 다시 시도해 주세요.`);
    }
  };
```

- [ ] **Step 4: JSX 교체**

496-537행의 `addMode === "receipt"` 블록을 아래로 바꾼다. **`업로드 완료 — 자동 인식 후 재고에 반영되면 알려드립니다.` 문구는 여기서 사라진다.**

```tsx
                {addMode === "receipt" ? (
                  scanResult ? (
                    <ReceiptScanReview
                      result={scanResult}
                      submitting={receiptBusy === "saving"}
                      onCancel={() => {
                        setScanResult(null);
                        setReceiptFile(null);
                        setLastUpload(null);
                      }}
                      onConfirm={handleConfirmScanned}
                    />
                  ) : (
                  <div className="space-y-4">
                    <label
                      htmlFor="receipt-upload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      {receiptBusy === "uploading" ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="text-sm">영수증 업로드 중…</span>
                        </>
                      ) : receiptBusy === "scanning" ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="text-sm">영수증을 읽고 있어요…</span>
                        </>
                      ) : receiptFile ? (
                        <>
                          <ScanLine className="h-8 w-8" />
                          <span className="text-sm font-medium">{receiptFile.name}</span>
                          <span className="text-xs">다른 파일을 선택하려면 클릭</span>
                        </>
                      ) : (
                        <>
                          <Camera className="h-8 w-8" />
                          <span className="text-sm font-medium">영수증 사진 선택 또는 촬영</span>
                          <span className="text-xs">JPG · PNG · WEBP 지원</span>
                        </>
                      )}
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadReceipt(file);
                      }}
                    />
                    {scanError && lastUpload ? (
                      <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <p className="text-sm text-destructive">{scanError}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={receiptBusy !== "idle"}
                          onClick={() => {
                            const email = user?.email;
                            if (email) void runScan(email, lastUpload.bucket, lastUpload.key);
                          }}
                        >
                          다시 시도
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  )
                ) : (
```

- [ ] **Step 5: 품목 0개 처리 추가**

`ReceiptScanReview` 를 띄우는 조건을 `scanResult && scanResult.items.length > 0` 으로 바꾸고, 0개인 경우를 업로드 영역 안에 넣는다. Step 4 의 `scanResult ? (` 를 아래로 바꾼다.

```tsx
                  scanResult && scanResult.items.length > 0 ? (
```

그리고 Step 4 의 `{scanError && lastUpload ? (` 블록 **앞에** 아래를 넣는다.

```tsx
                    {scanResult && scanResult.items.length === 0 ? (
                      <div className="space-y-2 rounded-md border border-border bg-muted/40 px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                          읽을 수 있는 품목이 없었어요. 직접 입력으로 추가해 주세요.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => patchForm({ addMode: "manual" })}
                        >
                          직접 입력으로
                        </Button>
                      </div>
                    ) : null}
```

- [ ] **Step 6: 옛 토스트 제거 확인**

Run: `grep -n '곧 자동으로 인식되어\|자동 인식 후 재고에 반영되면' ~/projects/cloverky.cloud/lucky/components/inventory-feature-page.tsx`
Expected: 출력 없음. 남아 있으면 지운다.

- [ ] **Step 7: 타입체크와 린트**

Run:
```bash
cd ~/projects/cloverky.cloud/lucky && ./node_modules/.bin/tsc --noEmit -p tsconfig.json 2>&1 | tail -20
```
Expected: 에러 12건 (baseline)

Run: `cd ~/projects/cloverky.cloud/lucky && ./node_modules/.bin/eslint .`
Expected: 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add lucky/components/inventory-feature-page.tsx
git commit -m "feat(lucky): 영수증 스캔에 확인 화면 연결

업로드 → 인식 → 확인 → 담기로 흐름을 잇는다.
'자동 인식 후 반영되면 알려드립니다' 는 지운다 — 알리는 코드가
없었고, 이제는 그 자리에서 결과를 보여준다."
```

---

## Task 9: 실제 동작 검증

코드가 아니라 확인이다. 여기서 실패하면 앞 태스크로 돌아간다.

**Files:** 없음

**Interfaces:**
- Consumes: 전부
- Produces: 없음

- [ ] **Step 1: 백엔드 전체 테스트**

Run: `cd ~/projects/cloverky.cloud/clover && PYTHONPATH=apps:. .venv/bin/pytest apps/fridge/tests -q`
Expected: `17 passed`

- [ ] **Step 2: 일회용 컨테이너로 라우터 확인**

backend 컨테이너는 `api.cloverky.cloud` 로 나가는 실서비스다. 바로 교체하지 말고 빌드 후 일회용 컨테이너에서 먼저 확인한다.

Run:
```bash
ssh -p 2222 hi@192.168.0.3 "cd ~/projects/cloverky.cloud/clover && docker compose build backend && docker compose run --rm --no-deps backend python -c \"
from clover.main import app
print([r.path for r in app.routes if 'receipt' in r.path])
\""
```
Expected: `/api/fridge/receipt/scan-key` 가 목록에 있어야 한다. 없으면 import 에러 — 컨테이너 로그의 `fridge 라우터 로드 실패` warning 을 본다.

- [ ] **Step 3: 실제 영수증 이미지로 인식 확인**

Gemini 모델명 수정(Task 1)이 실제로 통했는지 여기서 판가름난다.

Run:
```bash
ssh -p 2222 hi@192.168.0.3 "cd ~/projects/cloverky.cloud/clover && docker compose up -d backend"
sleep 25
curl -s -X POST https://api.cloverky.cloud/api/fridge/receipt/scan \
  -F "image=@<실제 영수증 사진>;type=image/png" | head -c 400
```
Expected: `{"store_name": ..., "items": [...]}`. 502 가 나면 `GEMINI_MODEL` 설정을 다시 본다.

- [ ] **Step 4: 프론트 흐름 검증**

목 API + dev 서버로 확인 화면을 직접 태운다.

주의 — 백엔드·auth 의 CORS `allow_origins` 에는 `http://localhost:3000`·`http://127.0.0.1:3000` 만 있다. dev 서버를 다른 포트에 띄우면 실 API 호출이 CORS 로 전부 막히고, 프론트가 그 실패를 삼켜 "백엔드 서버에 연결할 수 없습니다" 로 바꿔버린다. Windows 3000 으로 터널을 걸면 docker 프론트 컨테이너가 이미 그 포트를 쓰고 있어 bind 가 조용히 실패하고 **옛 프로덕션 번들을 검증하게 된다.** 로컬 목 서버를 별도 포트에 띄우고 `NEXT_PUBLIC_API_URL` 을 거기로 돌린다.

확인할 것:
- 인식 성공 → 확인 화면에 품목이 뜨고 전체 체크되어 있다
- 체크 해제 후 버튼 문구가 `N개 중 M개 재고에 담기` 로 바뀐다
- 보관위치를 냉동으로 바꾸면 그 줄의 `~날짜` 가 다시 계산된다
- `날짜 따로` 를 누르면 그 줄만 날짜 블록이 펼쳐지고, 다시 누르면 접힌다
- 담기 성공 시 `내 냉장고 속으로 들어갔어요!` 토스트가 뜨고 재고 목록이 갱신된다
- 인식 실패 시 `다시 시도` 버튼이 뜨고, 누르면 재업로드 없이 같은 키로 재요청한다
- 품목 0개면 `직접 입력으로` 버튼이 뜬다

- [ ] **Step 5: 소비 패턴 분석이 안 깨졌는지 확인**

Run: `curl -s -o /dev/null -w "%{http_code}\n" "https://api.cloverky.cloud/api/receipts/images/mine" -H "X-User-Email: hisoyeon04@gmail.com"`
Expected: `200` — 이번 작업은 `receipts_ledger` 를 건드리지 않았으므로 그대로여야 한다.

- [ ] **Step 6: main 머지와 배포**

```bash
cd ~/projects/cloverky.cloud
git checkout main && git merge soyeon --no-edit
git push origin main soyeon
ssh -p 2222 hi@192.168.0.3 "cd ~/projects/cloverky.cloud && git pull --ff-only origin main && cd clover && docker compose build backend && docker compose up -d backend"
```

프론트는 Vercel 이 `origin/main` 푸시에 자동 배포한다.

---

## Self-Review 결과

**스펙 커버리지**

| 설계 문서 절 | 담당 태스크 |
|---|---|
| §4.1 `/scan-key` | Task 5 |
| §4.1 배선(포트·어댑터·provider) | Task 2·3·4·5 |
| §4.2 모델명 하드코딩 제거 | Task 1 |
| §4.3 DB 변경 없음 | 해당 태스크 없음 — 의도적 |
| §5 3단 상태 | Task 8 |
| §5 확인 화면(체크·인라인 수정·날짜) | Task 7 |
| §5.1 문구 교체 | Task 8 Step 3·4·6 |
| §6 실패 처리 | Task 6(타임아웃·401), Task 8(업로드 실패·재시도·0건·부분 실패) |
| §7 검증 | Task 9 |

**확인한 사실**

- `lucky/components/ui/checkbox.tsx` 존재 — Task 7 의 `Checkbox` import 가 유효하다.
- `InventoryItemPayload` 는 `name·quantity·unit·storage` 필수, `expiry_date?·purchased_date?·min_quantity?` 선택 — Task 7 의 `toPayloads` 반환이 이에 맞다.
- `clover/.venv` 에 `boto3`·`google.genai` 없음, `pytest`·`fastapi`·`sqlalchemy`·`pydantic` 있음 — lazy import 제약의 근거다.
- 기존 `apps/fridge/tests` 는 7건 통과 — Task 4·9 의 기대치(17건)는 여기에 신규 10건을 더한 값이다.

**타입 일관성** — `ReceiptParseResultDto.purchased_date` 는 백엔드에서 `str | None`(ISO), 프론트 `ReceiptScanResult.purchased_date` 도 `string | null` 로 일치한다. `ReceiptOcrEnginePort.extract` 와 `ReceiptImageReaderPort.read` 의 시그니처는 Task 2·3 에서 정의한 것을 Task 4 의 테스트 fake 와 Task 5 의 provider 가 그대로 쓴다.

**의도적으로 남긴 것** — 인식 결과를 DB 에 저장하지 않으므로 `receipts`/`receipt_lines` 테이블과 `ReceiptPgRepository.get_status` 목업은 그대로다. 설계 문서 §2 의 결정이다.
