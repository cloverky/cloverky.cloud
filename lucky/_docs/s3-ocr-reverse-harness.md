# S3-OCR 영수증 파이프라인 — 프론트엔드(lucky) 하네스

> Claude Code 작업 지시서. 대상: `lucky/` (Next.js App Router, port 3000).
> 반드시 같이 읽는다: [`clover/_docs/s3-ocr-reverse-harness.md`](../../clover/_docs/s3-ocr-reverse-harness.md) (백엔드 하네스 — 이 문서의 엔드포인트·DTO는 전부 그 문서 기준이며, 그쪽 §9가 아직 미확정이므로 이 문서도 확정 전 초안이다).
> 코딩 규칙: [`.claude/rules/typescript.md`](../../.claude/rules/typescript.md) (예: `type` 별칭 우선, `any` 금지, snake_case 응답 필드 유지) 를 그대로 따른다.

---

## 0. 컨텍스트

### 0.1 도메인 정정 — "가계부"가 아니라 "식재료 재고 자동 등록"이다

원본 지시서의 `Receipt`/`ReceiptItem` 타입은 `price`, `totalAmount` 등 지출 관리(가계부) 필드를 가정하지만, 이 프로젝트(`../../CLAUDE.md` §프로젝트 정체성)는 식재료 관리 서비스이고 백엔드 DTO(`clover/_docs/s3-ocr-reverse-harness.md` §3)에는 금액 필드가 없다 — `store_name`, `purchased_date`, `items[{name, quantity, unit}]`뿐이다. **`price`/`totalAmount` 필드를 만들지 않는다.**

### 0.2 이미 존재하는 구현 — 처음부터 만드는 게 아니다

`components/inventory-feature-page.tsx`에 "영수증 스캔" 추가 모드가 **이미 동작 중**이다:

- `lib/inventory-api.ts`의 `scanReceipt(imageFile)` — `POST /api/fridge/receipt/scan`으로 이미지를 즉석 업로드해 `{ store_name, purchased_date, items }`를 받는다 (저장 없이 응답만).
- 인식 결과를 체크박스 리스트로 보여주고(`receiptResult.items.map(...)`), 선택한 품목만 `createInventoryItem`을 반복 호출해 재고에 추가한다(`handleAddFromReceipt`).
- 로딩/빈 상태/에러 처리는 `Loader2` 스피너 + `sonner` 토스트 조합으로 이미 패턴이 잡혀 있다.

이 문서가 다루는 것은 이 즉석 스캔과는 **다른 흐름**이다: 모바일(Flutter)이 미리 S3에 올려둔 영수증들을 웹이 **화면 진입 시 일괄로 불러와 처리 상태를 보여주는 배치 파이프라인 UI**(백엔드 하네스의 `GET /pending-process`, `GET /receipt`, `PUT /receipt/{id}`)다. 즉석 스캔 기능은 그대로 두고, 같은 카드/리스트 UI 패턴을 재사용해서 새 섹션을 추가한다 — 처음부터 새로 디자인하지 않는다.

### 0.3 API 경로 관례

`lucky`는 백엔드 라우트 앞에 `/api/fridge` 프리픽스를 붙여 호출한다 — 기존 `scanReceipt`가 이미 `/api/fridge/receipt/scan`을 쓰고 있다. 신규 엔드포인트도 동일하게 `/api/fridge/receipt/pending-process`, `/api/fridge/receipt`, `/api/fridge/receipt/{id}` 형태로 호출한다. (`lucky/CLAUDE.md`의 "`/receipts`" 표기와 실제 코드의 단수 `/receipt`가 다른 것은 백엔드 하네스 §0.3/§9와 동일한 기존 불일치이므로 이 문서에서 별도로 다루지 않는다.)

### 0.4 백엔드가 아직 미확정이다

`clover/_docs/s3-ocr-reverse-harness.md` §9는 OCR 1단계/2단계 여부, Flutter 업로드 방식(프록시 vs presigned URL), S3 key 컬럼 추가 여부 등을 열린 질문으로 남겨뒀다. **이 문서의 §3 타입과 §4 API 함수는 그 결정이 나기 전까지 초안이다** — 백엔드 DTO가 확정되면 이 문서와 실제 코드를 함께 갱신한다.

---

## 1. 절대 규칙

1. `price`/`totalAmount` 등 지출 관련 필드를 만들지 않는다 (§0.1) — 백엔드에 없는 필드를 프론트가 먼저 가정하지 않는다.
2. 컴포넌트에 직접 `fetch`를 넣지 않는다. API 함수는 `lib/inventory-api.ts`에 추가한다 — `scanReceipt`가 이미 이 파일에 있으므로 같은 파일에 모아 일관성을 유지한다(파일이 지나치게 커지면 §9에서 분리 여부를 확인한다).
3. 비동기 상태는 이 저장소 기존 관례를 따라 **discriminated union**으로 표현한다(`components/mail-contacts-dialog.tsx`의 `UploadStatus`, `components/titanic-csv-upload-section.tsx`의 `Status` 참고). 원본 지시서의 `'IDLE' | 'FETCHING_S3_OCR' | 'SUCCESS' | 'ERROR'` 같은 순수 문자열 유니온 대신 아래 §5 형태를 쓴다.
4. 백엔드 응답 필드는 **snake_case를 그대로 유지**한다 (`.claude/rules/typescript.md` §10) — `store_name`, `purchased_date`를 `storeName`, `purchasedAt`으로 바꾸지 않는다.
5. `type` 별칭 사용, `any` 금지, `import type`으로 타입 전용 임포트, `catch` 바인딩은 `unknown`으로 좁히기 — `.claude/rules/typescript.md` 전체 규칙 그대로 적용.
6. shadcn/ui 우선, `inventory-feature-page.tsx`의 `Card`/`Table`/체크박스 리스트 패턴을 재사용한다. 새 디자인 언어를 도입하지 않는다.
7. `"use client"`는 이벤트 핸들러·훅이 필요한 곳에만 붙인다.
8. 인증은 기존 `request()` 헬�퍼(`lib/inventory-api.ts`)를 재사용한다 — `X-User-Email` 헤더 + `credentials: "include"` 쿠키, 401 시 `refreshAccessToken()` 자동 재시도까지 이미 구현돼 있다. 새로 만들지 않는다.

---

## 2. 배치 위치 (제안 — §9 확인 필요)

신규 라우트(`app/receipts/page.tsx`)를 만들기보다, 기존 `inventory-feature-page.tsx`에 "일괄 처리 확인" 카드를 하나 더 추가하는 쪽을 제안한다. 이유:

- 영수증 인식의 목적지가 결국 `inventory`이므로(§0.1) 사용자 입장에서 같은 화면에서 처리하는 게 자연스럽다.
- 라우트를 늘리면 `lucky/CLAUDE.md` §디렉터리 구조에 새 섹션이 추가되고 내비게이션 항목도 늘어난다 — 지금 스코프에서 정당화되는지 불확실.
- 기존 "직접 입력 / 영수증 스캔" 토글(`addMode`)에 세 번째 모드(`"pending-batch"` 등)를 추가하는 형태로 자연스럽게 확장 가능.

---

## 3. 타입 정의 (`lib/inventory-api.ts`에 추가 — 초안)

```ts
export type ReceiptItemDraft = {
  name: string;
  quantity: number;
  unit: string;
};

export type ReceiptSummary = {
  id: number;
  store_name: string | null;
  purchased_date: string | null;
  status: "pending" | "processed" | "failed";
  items: ReceiptItemDraft[];
};

export type ReceiptProcessResult = {
  processed: ReceiptSummary[];
  failed_count: number;
};
```

백엔드 하네스 §3의 `ReceiptProcessResultDto`/`ReceiptSummaryDto` 필드가 구현 시점에 달라지면 이 타입도 그에 맞춰 다시 정의한다 — 지금은 인터페이스 형태만 앞서 잡아둔 것이다.

---

## 4. API 클라이언트 함수 (`lib/inventory-api.ts`에 추가)

```ts
export function processPendingReceipts(email: string): Promise<ReceiptProcessResult> {
  return request<ReceiptProcessResult>(email, "/api/fridge/receipt/pending-process");
}

export function fetchReceipts(email: string): Promise<ReceiptSummary[]> {
  return request<ReceiptSummary[]>(email, "/api/fridge/receipt");
}

export function updateReceipt(
  email: string,
  id: number,
  payload: Partial<{
    store_name: string;
    purchased_date: string;
    items: ReceiptItemDraft[];
  }>,
): Promise<ReceiptSummary> {
  return request<ReceiptSummary>(email, `/api/fridge/receipt/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
```

기존 `request()` 헬퍼(에러 파싱 `parseApiError`, 401 재시도)를 그대로 쓴다 — 새 fetch 래퍼를 만들지 않는다.

---

## 5. 상태 관리

```ts
type ReceiptPipelineState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; receipts: ReceiptSummary[] }
  | { kind: "error"; message: string };
```

페이지(또는 섹션) 진입 시 자동 호출 — `inventory-feature-page.tsx`의 기존 패턴을 그대로 따른다:

```ts
const load = useCallback(async () => {
  const email = user?.email;
  if (!email) return;
  setPipeline({ kind: "loading" });
  try {
    const result = await processPendingReceipts(email);
    setPipeline({ kind: "success", receipts: result.processed });
  } catch (e) {
    setPipeline({
      kind: "error",
      message: e instanceof Error ? e.message : "영수증 처리에 실패했습니다.",
    });
  }
}, [user?.email]);

useEffect(() => {
  if (isReady && user?.email) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }
}, [isReady, user?.email, load]);
```

---

## 6. UI 구성 (재사용 우선)

- 처리 결과 리스트는 기존 "영수증 스캔" 체크박스 리스트(`divide-y divide-border rounded-md border` + `label` 패턴, `inventory-feature-page.tsx:578-595`)를 그대로 재사용한다.
- `status === "failed"` 항목은 `Badge variant="outline"`에 destructive 톤(`statusBadgeClass` 패턴 재사용)을 적용하고, 인라인 편집 폼(`store_name`, `purchased_date`, 품목별 `name`/`quantity`/`unit` `Input`)을 펼쳐 `updateReceipt`로 저장하게 한다.
- 로딩 표시는 기존 `Loader2` 스피너 + 안내 문구 패턴을 재사용한다.
- 처리할 영수증이 없는 경우(`processed: []`) 에러가 아니라 "처리할 영수증이 없습니다" 같은 빈 상태 문구를 보여준다 — `items.length === 0`일 때의 기존 빈 상태 문구 패턴 참고.

---

## 7. 구현 순서

1. `lib/inventory-api.ts`에 §3 타입 3종 추가 (백엔드 DTO 확정 후 필드 재확인)
2. 같은 파일에 §4 API 함수 3종 추가
3. §9에서 배치 위치 확정 후, `inventory-feature-page.tsx`에 새 `addMode`(또는 결정된 위치)로 섹션 추가
4. §5 상태 머신 적용, 진입 시 자동 호출
5. `PUT` 인라인 수정 폼 — 저장 성공 시 목록 갱신
6. `cd lucky && npm run lint && npx tsc --noEmit && npx prettier --write .`

---

## 8. 완료 기준

- [ ] 로그인 사용자가 화면 진입 시 `/api/fridge/receipt/pending-process`가 1회 자동 호출됨
- [ ] 처리 결과가 없을 때 에러가 아니라 빈 상태 문구가 표시됨
- [ ] `status: "failed"` 건은 목록에 표시되고, 유저가 수정 후 `PUT`으로 저장 가능
- [ ] 기존 즉석 스캔(`scanReceipt`, `POST /receipt/scan`) 기능 회귀 없음
- [ ] `npm run lint`, `npx tsc --noEmit` 통과 — `console.log` 잔존 없음, `any` 없음, snake_case 필드 유지

---

## 9. 확인이 필요한 지점 (구현 착수 전 질문)

- 백엔드 하네스(§9)가 미확정 — `ReceiptProcessResultDto`/`ReceiptSummaryDto`의 실제 필드가 정해지면 이 문서 §3을 다시 맞춰야 한다.
- UI 배치: §2 제안대로 기존 `inventory-feature-page.tsx`에 섹션을 추가할지, 별도 `/receipts` 라우트를 신설할지.
- 즉석 스캔(기존)과 배치 파이프라인(신규) UI를 하나의 "영수증" 탭으로 통합할지, 완전히 분리된 진입점으로 둘지.
- 원본 이미지 미리보기(`s3ImageUrl` 표시): 보여주려면 S3 객체 public read 또는 presigned GET URL 발급이 필요한데 백엔드에 아직 없다 — 이번 스코프에 포함할지.
- 폴링 방식: 화면 진입 시 1회 호출로 충분한지, 주기적 재시도가 필요한지 (SWR/React Query 미도입 상태 — `lucky/CLAUDE.md` §상태 관리, 도입 여부는 별도 논의).
