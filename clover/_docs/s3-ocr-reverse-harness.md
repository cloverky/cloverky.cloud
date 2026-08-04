# S3-OCR 영수증 파이프라인 — 백엔드(fridge 앱) 하네스

> Claude Code 작업 지시서. 대상: `clover/apps/fridge/` (port 8000, `main.py`).
> 원칙: 이미 동작이 검증된 Gemini Vision 프롬프트·JSON 파싱 로직은 위치만 옮기고 문구는 건드리지 않는다. 새로 만드는 건 그 로직을 감싸는 포트/어댑터 껍데기뿐이다.
> 관련 문서: [`../CLAUDE.md`](../../CLAUDE.md) §스타 토폴로지 아키텍처, §프로젝트 정체성 (반드시 같이 읽는다),
> [`clover/CLAUDE.md`](../CLAUDE.md) §fridge 도메인 결정 사항, §헥사고날 아키텍처,
> [`clover/_docs/flutter-kakao-oauth-harness.md`](./flutter-kakao-oauth-harness.md) (동일 형식의 선행 하네스 — 스포크 격리 판단 근거로 참고).

---

## 0. 컨텍스트

### 0.1 도메인 정정 — "가계부"가 아니라 "식재료 인식"이다

이 작업의 원본 지시서는 영수증 OCR을 지출 기록(가계부) 도메인으로 가정하지만, 이 프로젝트(`../CLAUDE.md` §프로젝트 정체성)는 **AI 기반 식재료 관리 서비스**다. 영수증을 읽는 목적은 지출 내역 저장이 아니라 **유통기한이 임박한 식재료를 자동으로 인식해 냉장고 재고(`inventory`)에 등록하기 위한 인식 소스 확보**다. 이 문서의 `Receipt`/`ReceiptLine`은 어디까지나 "재고 자동 등록의 원본 증빙"이며, 최종 소비처는 `fridge`의 `inventory`+`foods` 테이블이다(§9 확인 필요 항목 참고 — 이번 스코프에 자동 등록까지 포함할지는 아직 미정).

### 0.2 실제 코드 현황 (조사 결과)

원본 지시서를 그대로 적용하기 전에, 이미 존재하는 코드를 확인했다:

| 파일 | 실제 상태 |
|------|-----------|
| `fridge/adapter/inbound/api/v1/receipt_router.py` | `POST /receipt/scan` — Gemini Vision으로 이미지 1장을 즉석에서 구조화 JSON(`store_name`/`purchased_date`/`items`)으로 변환해 **응답만 하고 버린다**. DB 저장 없음, S3 연동 없음. 프롬프트·JSON 추출 정규식은 실전 검증된 로직이라 **그대로 재사용**한다. |
| `fridge/app/ports/output/receipt_repository.py` / `receipt_pg_repository.py` | `ReceiptRepository.get_status()` 하나뿐이고, `ReceiptPgRepository.get_status`는 `self.session`을 쓰지도 않고 `ReceiptUploadResponse(id=1, status=query.status)`를 **항상 하드코딩 반환**한다. |
| `fridge/adapter/inbound/api/v1/receipt_line_router.py` | `GET /lines`가 쿼리 파라미터도 받지 않고 `receipt_id=1, line_name="사과"`를 **항상 고정 반환**한다. `ReceiptLinePgRepository.get_lines`도 동일하게 하드코딩. |
| `fridge/adapter/outbound/orm/receipt_orm.py`, `receipt_line_orm.py` | `receipts`, `receipt_lines` 테이블은 실제로 존재하고 스키마도 정상. S3 key 컬럼은 없음. |

즉 지금은 "포트/인터랙터 껍데기는 있지만 진짜 로직은 라우터에 있고, 껍데기 내부는 전부 목업"인 상태다. 이 하네스는 **이 껍데기를 실제 구현으로 채우는 작업**이며, 루트 `CLAUDE.md` §3(정밀한 수정) 예외에 해당한다 — "필요 없는 리팩터 금지" 원칙은 유지하되, 이 자리를 채우는 것 자체가 요청받은 작업이다.

### 0.3 문서-코드 불일치

루트 `CLAUDE.md`의 "슬라이스별 API" 표는 receipt scan을 `ReceiptScanInteractor` / `dependencies/receipt_scan.py`로 적어두었지만, 저장소 전체를 grep해도 그 이름은 **0건**이다. 실제 이름은 `ReceiptInteractor` / `dependencies/receipt_provider.py`. 이 하네스는 실제 코드 이름을 기준으로 작성한다 — 표를 코드에 맞춰 고칠지, 이번에 코드 이름을 표에 맞출지는 §9에서 확인한다.

### 0.4 `admin`의 S3 코드를 재사용하지 않는 이유

`clover/apps/admin/`에 이미 `S3ImageUploadUseCase` / `S3ImageStorageGateway`(`admin/images/{yyyy}/{mm}/{dd}/{uuid}.{ext}` 프리픽스)가 구현돼 있다. **가져다 쓰지 않는다.** `admin`은 `.importlinter`의 `star-topology-no-spoke-to-spoke` 계약이 보호하는 스포크이고(`../CLAUDE.md` §스타 토폴로지: "스포크 → 스포크 직접 참조 금지"), `fridge`가 `admin.*`을 import하면 이 규칙을 위반한다. 대신 `fridge` 전용 S3 아웃바운드 어댑터를 새로 만든다 — 패턴은 이미 같은 방식을 쓰는 `vision/adapter/outbound/resource_adapters/s3_yolo_dataset_adapter.py`를 참고한다(`S3_BUCKET`/`AWS_DEFAULT_REGION` env var + `boto3.client("s3")`, 둘 다 이미 `.env.example`에 등록돼 있어 새 변수가 필요 없다).

### 0.5 Flutter 직접 업로드 전제는 아직 인프라가 없다

원본 지시서는 "Flutter 앱이 S3에 업로드한 원본 이미지"를 전제하지만, 이 저장소에는 presigned URL 발급 로직이 **전혀 없다**(grep 0건). 지금 유일한 선례는 admin의 "백엔드 경유 프록시 업로드" 방식(`POST /s3/images` — 클라이언트가 백엔드로 파일을 보내면 백엔드가 S3에 올림)이다. 이 문서는 같은 방식을 fridge에도 적용하는 것을 기본 제안으로 삼는다 — presigned URL 발급은 별도 인프라 작업이므로 §9에서 확인 후 착수한다.

---

## 1. 절대 규칙

1. `fridge`에서 `admin.*`을 import하지 않는다 (§0.4). 공유가 필요하면 `star_craft` 또는 `clover.core.*`를 경유한다.
2. `receipt_line_router.py`의 하드코딩 스텁, `ReceiptPgRepository`/`ReceiptLinePgRepository`의 목업 반환은 실제 구현으로 교체한다. 반대로 **로직 자체(프롬프트 문구, JSON 추출 정규식)는 임의로 개선하지 않는다** — 위치만 `adapter/outbound/gemini/receipt_ocr_gateway.py`로 옮긴다.
3. Gemini 모델명 하드코딩 금지. 현재 `receipt_router.py`의 `_MODEL = "gemini-2.0-flash"`는 이미 다른 곳에서 401/단종으로 확인되어 고쳐진 것과 동일한 버그다(커밋 `ee1fd052`, `226f4f38` — `gemini-2.0-flash` 401, `gemini-2.5-flash` 단종). `admin/adapter/outbound/llm/chat_gateway.py`와 동일하게 `os.getenv("GEMINI_MODEL", "gemini-flash-latest")`를 쓴다.
4. Gemini 클라이언트는 `core.matrix.wault_keymaker_serect_manager.get_keymaker()`를 재사용한다 (`is_gemini_ready()`, `get_gemini_client()`) — 새 부트스트랩 코드 작성 금지.
5. `receipts`/`receipt_lines` ORM 스키마는 그대로 쓴다. S3 key를 저장할 컬럼이 필요하면(§9) 임의로 컬럼을 추가하지 말고 먼저 확인한다 — Neon 마이그레이션 영향.
6. `fridge`의 모든 `__init__.py`는 0바이트를 유지한다.
7. 라우터는 얇게 유지한다 — OCR 오케스트레이션·S3 순회는 인터랙터로, 라우터는 파싱·위임·응답 매핑만 한다 (`clover/CLAUDE.md` §FastAPI 규칙, Thin Controller).
8. `use_cases`는 `adapter` 구현체를 직접 import하지 않는다 (`app/ports`만 의존) — `import-linter`의 `clean-arch-usecase-no-adapter` 계약이 실제로 검사한다.

---

## 2. 신규/변경 파일 구조

```
clover/apps/fridge/
├── adapter/
│   ├── inbound/api/v1/
│   │   ├── receipt_router.py                     # [변경] OCR 로직 제거 → 인터랙터 위임. 신규 엔드포인트 추가(§5)
│   │   └── receipt_line_router.py                 # [변경] 하드코딩 제거 → 실제 조회로 교체
│   └── outbound/
│       ├── s3/
│       │   └── receipt_image_storage_gateway.py    # [신규] ReceiptImageStoragePort 구현 — fridge 전용 S3 client
│       ├── gemini/
│       │   └── receipt_ocr_gateway.py              # [신규] ReceiptOcrEnginePort 구현 — 기존 프롬프트/파싱 이관
│       └── repositories/
│           ├── receipt_pg_repository.py            # [변경] get_status 목업 제거 → save/find_by_user 실구현
│           └── receipt_line_pg_repository.py       # [변경] get_lines 목업 제거 → save_many/find_by_receipt 실구현
├── app/
│   ├── dtos/
│   │   ├── receipt_dto.py                          # [변경] ReceiptProcessResultDto 등 추가
│   │   └── receipt_line_dto.py                     # [변경] 벌크 저장용 DTO 추가
│   ├── ports/
│   │   ├── input/
│   │   │   └── receipt_use_case.py                 # [변경] process_pending_receipts / get_receipts 추가
│   │   └── output/
│   │       ├── receipt_repository.py               # [변경] save / find_by_user 추가
│   │       ├── receipt_line_repository.py           # [변경] save_many / find_by_receipt 추가
│   │       ├── receipt_image_storage_port.py         # [신규]
│   │       └── receipt_ocr_engine_port.py            # [신규]
│   └── use_cases/
│       └── receipt_interactor.py                    # [변경] process_pending_receipts 오케스트레이션 추가
└── dependencies/
    └── receipt_provider.py                          # [변경] 위 어댑터 3종 조립
```

기존 `ReceiptInteractor`에 메서드를 추가하는 방식으로 간다 — 웹/모바일처럼 완전히 다른 포트 의존성을 갖는 상황이 아니므로(`../CLAUDE.md` §fridge 도메인 결정 사항과 동일 앱 내 슬라이스 확장), 카카오 하네스(§1.2)처럼 별도 인터랙터로 쪼갤 필요는 없다.

---

## 3. 포트 시그니처 (계약)

```python
# app/ports/output/receipt_image_storage_port.py
class ReceiptImageStoragePort(ABC):
    async def list_pending_keys(self, user_id: int, limit: int = 20) -> list[str]: ...
    async def get_image_bytes(self, key: str) -> tuple[bytes, str]: ...  # (bytes, content_type)
    async def mark_processed(self, key: str) -> str: ...                # 이동 후 새 key 반환

# app/ports/output/receipt_ocr_engine_port.py
class ReceiptOcrEnginePort(ABC):
    async def extract(self, image_bytes: bytes, mime_type: str) -> ReceiptOcrResultDto: ...
    # 실패 시 ValueError — 라우터/인터랙터가 사용자 노출 메시지로 변환한다.
    # ReceiptOcrResultDto: store_name, purchased_date, items(list[ReceiptLineParsedDto])
    # → receipt_router.py의 _extract_json 로직을 그대로 이 어댑터 내부로 이관

# app/ports/output/receipt_repository.py (확장)
class ReceiptRepository(ABC):
    async def get_status(self, query: ReceiptQuery) -> ReceiptUploadResponse: ...  # 기존 유지
    async def save(self, command: ReceiptSaveCommand) -> int: ...                  # 신규 — receipt id 반환
    async def find_by_user(self, user_id: int) -> list[ReceiptSummaryDto]: ...     # 신규

# app/ports/output/receipt_line_repository.py (확장)
class ReceiptLineRepository(ABC):
    async def get_lines(self, query: ReceiptLineQuery) -> ReceiptLineResponse: ...  # 기존 유지 (또는 §9 확인 후 폐기)
    async def save_many(self, receipt_id: int, lines: list[ReceiptLineParsedDto]) -> None: ...  # 신규
    async def find_by_receipt(self, receipt_id: int) -> list[ReceiptLineResponse]: ...            # 신규

# app/ports/input/receipt_use_case.py (확장)
class ReceiptUseCase(ABC):
    async def get_status(self, schema: ReceiptUploadSchema) -> ReceiptUploadResponse: ...  # 기존 유지
    async def process_pending_receipts(self, user_id: int) -> list[ReceiptProcessResultDto]: ...  # 신규 — §5 파이프라인 전체
    async def get_receipts(self, user_id: int) -> list[ReceiptSummaryDto]: ...                     # 신규
```

`ReceiptOcrEnginePort.extract`가 이미지 → **구조화 JSON을 한 번에** 반환하는 단일 단계 설계임에 주의한다. 원본 지시서는 "OCR raw text 추출 → 정규식 `ReceiptParser`로 파싱"이라는 2단계 구조를 가정하지만, 이 프로젝트는 Gemini Vision이 이미지에서 곧바로 구조화 데이터를 뽑아내는 **1단계 방식으로 이미 검증되어 있다**(`receipt_router.py`). 별도 정규식 파서 도메인 서비스를 새로 만드는 대신 이 1단계 방식을 유지할 것을 제안한다 — §9에서 확정한다.

---

## 4. `ProcessPendingReceipts` 오케스트레이션 (`ReceiptInteractor.process_pending_receipts`)

1. `ReceiptImageStoragePort.list_pending_keys(user_id)`로 미처리 S3 키 목록 조회.
2. 각 키에 대해:
   - `get_image_bytes(key)`로 이미지 다운로드
   - `ReceiptOcrEnginePort.extract(bytes, content_type)`로 구조화 결과 추출 — 실패 시 해당 키는 `FAILED`로 기록하고 다음 키로 진행(전체 배치를 중단하지 않는다)
   - `ReceiptRepository.save(...)`로 `receipts` row 저장 (`status="processed"` 또는 `"failed"`)
   - 성공한 경우만 `ReceiptLineRepository.save_many(...)`로 `receipt_lines` 저장
   - `mark_processed(key)`로 S3 상 위치 이동
3. 처리 결과 DTO 목록 반환 (성공/실패 모두 포함 — 웹 화면에서 실패 건은 유저가 직접 수정 가능하도록, 원본 지시서 Step 2-2 요구사항 유지).

---

## 5. S3 키 네임스페이스 (제안값 — §9 확인 필요)

| 상태 | 프리픽스 | 비고 |
|------|----------|------|
| 업로드 직후(미처리) | `receipts/pending/{user_id}/{uuid}.{ext}` | admin의 날짜 프리픽스 대신 user_id로 구분 — pending 목록 조회가 `user_id` 기준이므로 |
| 처리 완료 | `receipts/processed/{user_id}/{uuid}.{ext}` | `mark_processed`가 `copy_object` + `delete_object`로 이동 |

`S3_BUCKET`, `AWS_DEFAULT_REGION`은 기존 값을 그대로 재사용한다 — 신규 버킷/자격증명 불필요.

---

## 6. 라우터 (`receipt_router.py`, prefix `/receipt` 유지)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/scan` | **기존 유지** — 즉석 업로드→구조화 JSON 반환(미저장). 미리보기 용도로 남길지는 §9 확인 |
| GET | `/pending-process` | 원본 지시서 Step 4 사양 — S3 파이프라인(§4) 수행 후 처리 결과 반환 |
| GET | `` (`/receipt`) | 저장된 영수증 목록 조회 (`find_by_user`) |
| PUT | `/{id}` | 유저 수정 반영 (파싱 실패/오인식 항목 보정) |

`receipt_line_router.py`의 `GET /lines`는 `receipt_id`를 쿼리 파라미터로 받아 `find_by_receipt`로 교체한다 (현재는 파라미터 자체가 없다).

---

## 7. 환경 변수

신규 변수 없음 — 전부 기존 값 재사용:

| 변수 | 용도 | 현재 상태 |
|------|------|-----------|
| `S3_BUCKET` | 영수증 이미지 버킷 | `vision`, `admin`에서 이미 사용 중 |
| `AWS_DEFAULT_REGION` | S3 리전 | 이미 `.env.example`에 있음 |
| `GEMINI_MODEL` | OCR용 Gemini 모델명 | `admin/adapter/outbound/llm/chat_gateway.py`가 이미 사용 — receipt 쪽만 하드코딩 상태였음(§1.3) |

---

## 8. 구현 순서

1. `app/ports/output/receipt_image_storage_port.py`, `receipt_ocr_engine_port.py` 정의 (§3)
2. `app/dtos/receipt_dto.py`, `receipt_line_dto.py`에 신규 DTO 추가
3. `adapter/outbound/gemini/receipt_ocr_gateway.py` — `receipt_router.py`의 프롬프트·`_extract_json`·아이템 정규화 로직 이관, `GEMINI_MODEL` env var 적용
4. `adapter/outbound/s3/receipt_image_storage_gateway.py` — `vision`의 S3 어댑터 패턴 참고, boto3 `list_objects_v2`/`get_object`/`copy_object`+`delete_object`
5. `adapter/outbound/repositories/receipt_pg_repository.py`, `receipt_line_pg_repository.py` — 목업 제거, 실제 세션 쿼리로 교체
6. `app/ports/input/receipt_use_case.py`, `app/ports/output/receipt_repository.py`, `receipt_line_repository.py` 확장 (§3)
7. `app/use_cases/receipt_interactor.py` — `process_pending_receipts` 오케스트레이션 구현 (§4)
8. `dependencies/receipt_provider.py` — 신규 어댑터 3종 조립
9. `adapter/inbound/api/v1/receipt_router.py`, `receipt_line_router.py` — 신규 엔드포인트 추가, 기존 로직 제거·위임으로 교체
10. `ReceiptParser` 단위 테스트 (§9에서 방식 확정 후 — 1단계 방식이면 `ReceiptOcrEnginePort` 어댑터의 JSON 정규화 로직 테스트로 대체)
11. `clover/CLAUDE.md` "슬라이스별 API" 표 갱신 여부는 완료 후 사용자에게 확인 (§0.3, 루트 CLAUDE.md Wiki/PKS 갱신 원칙)

---

## 9. 확인이 필요한 지점 (구현 착수 전 질문)

- **OCR 단계 설계**: 현재처럼 Gemini Vision 1단계(이미지→구조화 JSON) 방식을 유지할지, 원본 지시서대로 OCR raw text 추출 + 정규식 `ReceiptParser` 2단계로 전환할지. 전자를 권장한다 — 이미 검증됐고 더 단순하다.
- **Flutter 업로드 경로**: admin과 동일하게 fridge에도 "백엔드 경유 프록시 업로드" 엔드포인트를 새로 만들지(간단하지만 대용량 이미지가 백엔드를 경유), 아니면 presigned URL 발급을 새 인프라로 도입할지(이 리포에 아직 없음, 별도 작업량 발생).
- **인벤토리 자동 등록**: 인식된 품목(`receipt_lines`)을 `inventory`/`foods`에 자동 등록하는 것이 프로젝트 정체성상 최종 목적(§0.1)이지만, 이번 스코프에 포함할지 별도 유스케이스로 분리할지.
- **S3 key 컬럼 추가**: `receipts`/`receipt_lines`에는 현재 S3 key를 저장할 컬럼이 없다. 처리 완료 이미지 위치 추적이 필요하면 마이그레이션이 필요하다.
- **`CLAUDE.md` 문서 정합성**: §0.3에서 발견한 `ReceiptScanInteractor`/`dependencies/receipt_scan.py` 표기를 실제 이름(`ReceiptInteractor`/`receipt_provider.py`)에 맞게 문서를 고칠지, 반대로 이번에 코드 이름을 문서에 맞출지.
- **기존 `POST /receipt/scan` 존치 여부**: 미저장 즉석 스캔 엔드포인트를 미리보기 UX로 남길지, `/pending-process` 파이프라인으로 완전히 대체할지.
