# 영수증 스캔 → 재고 반영 설계

> 2026-08-04. 대상: `clover/apps/fridge`, `lucky/components/inventory-feature-page.tsx`.
> 관련: [`clover/_docs/s3-ocr-reverse-harness.md`](../clover/_docs/s3-ocr-reverse-harness.md) — 같은 주제의 선행 하네스. 이 문서가 그 §9(확인 필요 지점)에 대한 결정이며, 범위가 더 좁다.

## 1. 배경

재고 관리의 "영수증 스캔"은 지금 사진을 S3에 올리고 `receipt_images` 행을 남기는 것으로 끝난다. 화면은 "자동 인식 후 재고에 반영되면 알려드립니다"라고 하지만 **인식하는 코드도, 재고에 넣는 코드도, 알리는 코드도 없다.** `receipt_images.status` 는 `"pending"` 으로 쓰이기만 하고 읽는 곳이 없다.

인식 로직 자체는 이미 있다. `POST /api/fridge/receipt/scan` 이 Gemini Vision 으로 이미지에서 `store_name`/`purchased_date`/`items[]` 를 뽑아내지만 **응답만 하고 버리며, 프론트에서 호출하는 곳이 0건이다.**

이 작업은 그 사이를 잇는다.

## 2. 범위

**한다**

- 업로드한 영수증을 인식해 품목 목록을 얻는다.
- 사용자가 확인·수정한 뒤 재고에 담는다.
- 사진은 지금처럼 소비 패턴 분석에 남는다.

**하지 않는다**

- 인식 결과를 DB에 쌓지 않는다. `receipts`/`receipt_lines` 테이블은 목업인 채로 둔다. 마이그레이션 없음.
- 소비 패턴 분석 화면은 손대지 않는다. 사진 목록은 이미 동작한다.
- 알림(웹푸시·종 아이콘)을 붙이지 않는다. 동기 인식이라 사용자가 결과를 그 자리에서 보므로 알릴 대상이 없다.
- 여러 장 일괄 업로드를 지원하지 않는다.

## 3. 흐름

```
[재고 관리 → 영수증 스캔]
  파일 선택
    │  POST /api/receipts/images            (receipts_ledger, 기존)
    ▼
  S3 저장 + receipt_images 행 → { s3_bucket, s3_key }
    │  POST /api/fridge/receipt/scan-key    (fridge, 신규)
    ▼
  Gemini Vision → { store_name, purchased_date, items[] }
    │
    ▼
  확인 화면 — 체크박스 + 줄별 수정
    │  POST /api/fridge/inventory × 체크된 개수  (기존)
    ▼
  재고 반영

[소비 패턴 분석]  ← 사진은 이미 여기 뜬다 (변경 없음)
```

파일은 한 번만 전송하고, 인식은 S3 키로 한다. 5MB 사진을 두 번 올리지 않기 위해서다.

### 스포크 경계

`receipts_ledger` 와 `fridge` 는 둘 다 스포크이고, `.importlinter` 의 `star-topology-no-spoke-to-spoke` 계약이 서로의 직접 import 를 금지한다. 이 설계는 **파이썬 import 를 만들지 않는다** — 순서를 브라우저가 잡고, `fridge` 가 아는 것은 버킷·키 문자열뿐이다. 계약 변경도, `star_craft` 경유 배선도 필요 없다.

## 4. 백엔드

### 4.1 `POST /api/fridge/receipt/scan-key` (신규)

```
요청  { "s3_bucket": str, "s3_key": str }
응답  ReceiptScanResponse   ← 기존 /scan 과 동일한 스키마
```

S3 에서 이미지를 읽어 기존 `/scan` 과 같은 결과를 돌려준다.

기존 `POST /scan`(파일 직접) 엔드포인트는 **경로와 응답 스키마 그대로 유지**한다. 하네스 문서가 미리보기 용도로 언급했고, 지우면 회귀 위험만 생긴다. 다만 내부 구현은 아래 배선을 타도록 옮긴다.

#### 배선

`.importlinter` 의 `clean-arch-inbound-no-outbound` 계약이 `fridge.adapter.inbound` → `fridge.adapter.outbound` 직접 import 를 금지한다. 따라서 라우터가 게이트웨이를 직접 부를 수 없고, 기존 `inventory_router` 와 같은 provider 경유 방식을 따른다.

```
receipt_router (inbound)
  └ Depends(get_receipt_use_case)        ← fridge/dependencies/receipt_provider.py
      └ ReceiptInteractor (app/use_cases)
          ├ ReceiptOcrEnginePort         ← app/ports/output/receipt_ocr_engine_port.py  [신규]
          │   └ ReceiptOcrGateway        ← adapter/outbound/gemini/receipt_ocr_gateway.py  [신규]
          └ ReceiptImageReaderPort       ← app/ports/output/receipt_image_reader_port.py  [신규]
              └ S3ReceiptImageReader     ← adapter/outbound/s3/receipt_image_reader.py     [신규]
```

`ReceiptInteractor` 에 `scan_by_key(bucket, key)` 를 추가한다. `app/use_cases` 는 포트만 의존한다(`clean-arch-usecase-no-adapter` 계약).

프롬프트 문구·`_extract_json` 정규식·아이템 정규화 로직은 **한 글자도 바꾸지 않고** `receipt_router.py` 에서 `ReceiptOcrGateway` 로 이관한다. 이관 후 `/scan` 도 같은 게이트웨이를 거치도록 인터랙터 경유로 바꾼다 — 같은 로직이 두 벌 남지 않게 한다.

S3 읽기는 `vision/adapter/outbound/resource_adapters/s3_yolo_dataset_adapter.py` 패턴을 따른다(`boto3.client("s3")` + 기존 `S3_BUCKET`/`AWS_DEFAULT_REGION`). 신규 환경변수 없음.

`fridge` 의 모든 `__init__.py` 는 0바이트를 유지한다.

### 4.2 Gemini 모델명 하드코딩 제거 (필수 선행)

`receipt_router.py:12` 의 `_MODEL = "gemini-2.0-flash"` 를 `os.getenv("GEMINI_MODEL", "gemini-flash-latest")` 로 바꾼다.

이건 선택이 아니라 전제다. 이 키로 `gemini-2.0-flash` 는 쿼터 0 이고, 2026-08-04 라이브 `POST /api/fridge/receipt/scan` 에 테스트 이미지를 넣었을 때 오리진이 응답하지 못해 Cloudflare 502 가 났다. 고치지 않으면 이 기능 전체가 동작하지 않는다. 하네스 문서 §1.3 도 같은 지적을 하며 `admin/adapter/outbound/llm/chat_gateway.py` 와 동일한 방식을 지시한다.

### 4.3 DB

변경 없음.

## 5. 프론트엔드

`영수증 스캔` 탭이 세 상태를 가진다.

**① 업로드 전** — 현행 유지.

**② 인식 중** — 스피너 + "영수증을 읽고 있어요…". 업로드와 인식을 연달아 수행하는 동안 유지된다.

**③ 확인 화면**

```
영수증 확인 · OO마트 · 2026-08-04                    [전체 선택]

날짜  [구매일만 알아요] [유통기한 알아요]     ← 영수증 전체 기본값
      [2026-08-04]
      품목·보관 기준으로 유통기한을 추정합니다.

☑ [사과   ] [3] [개 ▾] [냉장 ▾]  ~2026-08-11
☑ [우유   ] [1] [개 ▾] [냉장 ▾]  ~2026-08-11   [날짜 따로]
☐ [봉투   ] [1] [개 ▾] [냉장 ▾]  ~2026-08-11

                              [3개 중 2개 재고에 담기]
```

- **날짜 블록은 영수증 단위로 한 번.** 영수증 하나는 구매일 하나이므로 줄마다 반복하지 않는다. 기존 직접 입력 폼의 토글·`type="date"` 입력·안내 문구를 그대로 재사용한다(`inventory-feature-page.tsx` 의 `dateMode`/`purchasedDate`/`expiryDate` 패턴).
- 구매일 기본값은 인식된 `purchased_date`. 인식되지 않았으면 오늘.
- **줄별 `[날짜 따로]`** 를 누르면 그 줄만 자기 날짜 블록을 펼친다. 이때 그 줄은 영수증 단위 날짜를 **완전히 무시**하고 자기 `dateMode` + 날짜를 쓴다(구매일·유통기한 둘 다). 다시 누르면 영수증 기본값으로 되돌아간다. 냉동식품 하나만 유통기한을 직접 넣는 경우의 탈출구다.
- 줄별 수정 요소는 품목명·수량·단위·보관위치 네 개로 제한한다. 단위는 `INVENTORY_UNITS`, 보관은 `INVENTORY_STORAGE` 를 쓴다.
- 유통기한 미리보기(`~2026-08-11`)는 `GET /api/fridge/inventory/estimate-expiry` 결과다. **품목명·보관위치·구매일 중 하나가 바뀌면** 그 줄만 다시 계산한다(300ms 디바운스). `dateMode` 가 `expiry` 인 줄은 호출하지 않는다 — 유통기한을 직접 받았으므로 추정이 필요 없다.
- 오인식된 줄("합계", "봉투")은 체크를 해제하거나 품목명을 고쳐 처리한다. 기본값은 전체 체크.

**담기** — 체크된 줄마다 `createInventoryItem` 을 호출한다. 완료 후 재고 목록을 새로고침하고 확인 화면을 닫는다.

### 5.1 문구

| 시점 | 문구 |
|------|------|
| 인식 완료 · 확인 화면 진입 | `업로드 완료 — 영수증에서 3개를 찾았어요. 담을 것만 골라주세요.` |
| 재고에 담은 뒤 | `내 냉장고 속으로 들어갔어요! 2개를 재고에 담았습니다.` |

기존의 사실과 다른 두 문구는 삭제한다.

- `업로드 완료 — 자동 인식 후 재고에 반영되면 알려드립니다.` (`inventory-feature-page.tsx:534`)
- 토스트 `영수증을 업로드했습니다. 곧 자동으로 인식되어 반영됩니다.` (`inventory-feature-page.tsx:251`)

## 6. 실패 처리

| 상황 | 처리 |
|------|------|
| 업로드 실패 | 현행대로 토스트. 확인 화면으로 넘어가지 않는다 |
| 인식 실패(502·422) | `영수증을 읽지 못했어요` + **[다시 시도]**. 사진은 이미 S3 에 있으므로 재업로드 없이 같은 키로 재시도한다 |
| 품목 0개 | `읽을 수 있는 품목이 없었어요. 직접 입력으로 추가해 주세요.` + 직접 입력 탭으로 전환하는 버튼 |
| 담기 중 일부 실패 | 성공·실패 개수를 알리고 실패한 줄은 확인 화면에 남긴다. 성공한 줄은 목록에서 제거해 중복 등록을 막는다 |
| 인식 지연 | 클라이언트 60초 타임아웃. Cloudflare 100초 한도 안쪽이다 |
| 401 | `inventory-api` 와 동일하게 [`lib/auth-session.ts`](../lucky/lib/auth-session.ts) 의 single-flight 갱신을 거친다. 새 갱신 로직을 만들지 않는다 |

## 7. 검증

`lucky` 에는 테스트 프레임워크가 없다(`package.json` 에 test 스크립트 없음). 따라서 계층별로 나눈다.

- **백엔드**: `clover` 의 pytest 로 OCR 응답 정규화 로직(JSON 추출, 수량·단위 기본값, 날짜 파싱)을 단위 테스트한다. Gemini 호출은 스텁으로 대체한다.
- **모델명**: `GEMINI_MODEL` 이 실제로 반영되는지 확인한다. 이 값이 틀리면 나머지가 전부 무의미하다.
- **라우터 등록 여부**: `fridge_router.py` 는 하위 라우터를 `importlib` 로 불러오면서 실패를 `logger.warning` 으로 삼킨다. 새 코드에 import 에러가 있으면 서버는 정상 기동하고 **receipt 라우터만 조용히 사라져 404** 가 된다. 배포 후 `/api/fridge/receipt/scan-key` 가 404 가 아닌지 반드시 확인하고, 404 라면 컨테이너 로그에서 해당 warning 을 먼저 본다.
- **프론트**: 목 API + dev 서버로 확인 화면 흐름(인식 성공/실패/0건, 체크 해제, 보관위치 변경 시 유통기한 재계산, 담기 후 상태)을 직접 태운다.

  주의 — 백엔드·auth 의 CORS `allow_origins` 에는 `http://localhost:3000`·`http://127.0.0.1:3000` 만 있다. dev 서버를 다른 포트에 띄우면 실 API 호출이 전부 CORS 로 막히고, 프론트가 그 실패를 `catch` 로 삼켜 "백엔드 서버에 연결할 수 없습니다"로 바꿔버린다. 그렇다고 Windows 3000 으로 터널을 걸면 docker 프론트 컨테이너가 이미 그 포트를 쓰고 있어 bind 가 조용히 실패하고, **옛 프로덕션 번들을 검증하게 된다.** 로컬 목 서버를 별도 포트에 띄우고 `NEXT_PUBLIC_API_URL` 을 거기로 돌리는 방식으로 우회한다.
- **타입체크**: `next.config.mjs` 가 `ignoreBuildErrors: true` 라 lint 로는 타입 에러가 잡히지 않는다. `tsc --noEmit` 을 따로 돌리고 기존 baseline(12건)과 비교한다.

## 8. 이 설계가 남기는 것

- 인식 결과가 DB 에 남지 않으므로 "이 영수증에서 무엇을 담았는지"는 나중에 볼 수 없다. 필요해지면 `receipts`/`receipt_lines` 실구현으로 확장한다 — 하네스 문서 §3~4 에 포트 시그니처가 이미 잡혀 있다.
- `/scan-key` 가 키를 받는 형태이므로, 나중에 여러 장 일괄·비동기 배치로 확장할 때 그대로 재사용된다.
