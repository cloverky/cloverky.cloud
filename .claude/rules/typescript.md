---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

## TypeScript 규칙

> 기준 구현체: `lucky/` (Next.js 16 · React 19 · TypeScript 5.7).
> 아래 규칙은 `lucky/tsconfig.json` 과 `lucky/eslint.config.mjs` 가 실제로 강제하는 내용을 문서화한 것이다.
> 새 TypeScript 코드는 이 패턴을 유지한다.

---

### 1. 컴파일러 설정 (변경 금지)

`lucky/tsconfig.json` 의 다음 옵션은 임의로 완화하지 않는다.

| 옵션 | 값 | 이유 |
|------|-----|------|
| `strict` | `true` | **필수.** 개별 하위 플래그(`strictNullChecks` 등)를 끄지 않는다. |
| `isolatedModules` | `true` | 파일 단위 트랜스파일 — 타입 전용 re-export는 `export type` 필요 |
| `moduleResolution` | `"bundler"` | Next.js 번들러 기준. `node`/`node16` 으로 되돌리지 않는다. |
| `noEmit` | `true` | 빌드는 Next.js 가 담당 |
| `paths` | `{ "@/*": ["./*"] }` | 절대 경로 임포트 |

**상대 경로 대신 `@/` 별칭을 쓴다.**

```ts
// ✅
import type { Contact } from "@/components/contacts-upload-dialog";
import { cn } from "@/lib/utils";

// ❌
import { cn } from "../../lib/utils";
```

---

### 2. `any` 금지 (`@typescript-eslint/no-explicit-any: error`)

현재 `lucky/` 코드베이스의 `: any` 사용은 **0건**이다. 이 상태를 유지한다.

외부 응답처럼 모양을 모르는 값은 `any` 가 아니라 **좁은 타입을 선언**한다.

```ts
// ✅ lib/inventory-api.ts 의 실제 패턴
type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

// ❌
function parseApiError(data: any, status: number) { ... }
```

정말 모양을 알 수 없으면 `unknown` 을 쓰고 좁혀서 사용한다. `any` 로 우회하지 않는다.

---

### 3. `type` 별칭 우선 (`interface` 보다)

**모든 객체 형태는 `type` 별칭으로 선언한다.** `interface` 는 선언 병합(declaration merging)이 실제로 필요할 때만 쓴다.

```ts
// ✅ 표준
export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  expiry_date: string | null;
  status: string;
};

// ❌ 새 코드에서 지양
export interface InventoryItem {
  id: number;
  // ...
}
```

기존 `interface` 를 발견해도 **요청 없이 변환하지 않는다** (루트 CLAUDE.md §3 Surgical Changes).
`components/ui/` 의 shadcn 생성 코드는 원본 스타일을 그대로 둔다.

---

### 4. 컴포넌트 Props 타이핑

Props 는 `type` 별칭으로 선언하고, 컴포넌트는 `export function` 으로 작성한다.
`React.FC` / `FC<Props>` 는 **사용하지 않는다** (현재 사용 0건).

```tsx
// ✅ 표준 패턴
type HeaderProps = {
  onSignUpClick: () => void;
  onLoginClick: () => void;
  onProfileEditClick: () => void;
};

export function Header({ onSignUpClick, onLoginClick, onProfileEditClick }: HeaderProps) {
  // ...
}

// ❌
const Header: React.FC<HeaderProps> = ({ ... }) => { ... };
```

**이름 규칙**

| 상황 | 이름 |
|------|------|
| 해당 파일의 주 컴포넌트 Props | `Props` |
| 한 파일에 여러 컴포넌트가 있을 때 | `<ComponentName>Props` (`GeminiChatDialogProps`) |
| Next.js 페이지 | `PageProps` |

---

### 5. 타입 전용 임포트 (`consistent-type-imports: error`)

타입만 가져올 때는 반드시 `import type` 을 쓴다. `isolatedModules` 때문에 런타임 임포트가 남으면 번들에 불필요한 의존이 생긴다.

```ts
// ✅
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import type { RecipeSummary, RecipeDetail } from "@/app/api/gemini/recipes/route";

// ❌
import { Metadata } from "next";
```

값과 타입을 함께 가져올 때는 임포트를 두 줄로 나눈다.

---

### 6. Non-null assertion 금지 (`no-non-null-assertion: error`)

`!` 로 null 을 지워버리지 않는다. 현재 사용 **0건**이다.

```ts
// ❌
const email = user!.email;
const el = document.getElementById("root")!;

// ✅ 좁히기 또는 기본값
if (!user) return null;
const email = user.email;

const el = document.getElementById("root");
if (!el) return;
```

옵셔널 체이닝 `?.` 와 nullish 병합 `??` 을 기본 도구로 쓴다.
`||` 는 `0` / `""` 를 falsy 로 삼켜버리므로 **`??` 를 우선**한다.

```ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
```

---

### 7. 미사용 변수 (`no-unused-vars`, `argsIgnorePattern: "^_"`)

의도적으로 쓰지 않는 인자만 `_` 접두사를 허용한다.

```ts
// ✅
items.map((_item, index) => index);

// ❌ 그냥 남겨둔 미사용 임포트·변수
import { useEffect } from "react"; // 쓰지 않음 → 제거
```

---

### 8. `console` 금지 (`no-console: error`)

프로덕션 코드에 `console.log` / `console.error` 를 남기지 않는다.
디버깅용으로 추가했다면 **커밋 전에 제거**한다. 사용자에게 보여줄 오류는 `sonner` 토스트 등 UI 로 전달한다.

---

### 9. `const` 기본 (`prefer-const`, `no-var`)

- 재할당하지 않는 바인딩은 전부 `const`
- `var` 금지
- 재할당이 필요한 경우에만 `let` — 이때는 타입을 명시한다

```ts
// ✅ lib/inventory-api.ts 실제 패턴
let res: Response;
try {
  res = await fetch(url);
} catch {
  throw new Error("서버에 연결할 수 없습니다.");
}
```

---

### 10. API 클라이언트 타입 규약 (`lib/*.ts`)

백엔드 연동 타입은 컴포넌트가 아니라 **`lib/` 의 API 클라이언트 모듈**에서 `export type` 으로 선언한다.

```ts
// lib/inventory-api.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export type InventoryItem = { /* ... */ };
export type InventoryStats = { total: number; expiring_soon: number; low_stock: number };
export type InventoryListResponse = { items: InventoryItem[]; stats: InventoryStats };
export type InventoryItemPayload = { /* 요청 바디 */ };

export async function fetchExpiryEstimate(
  name: string,
  purchasedDate: string,
  storage: string,
): Promise<ExpiryEstimate> { /* ... */ }
```

**규칙**

| 항목 | 규약 |
|------|------|
| 필드 네이밍 | 백엔드(FastAPI) 응답의 **snake_case 를 그대로 유지**한다. 클라이언트에서 camelCase 로 변환하지 않는다. |
| 함수 인자 | TypeScript 쪽 인자명은 camelCase (`purchasedDate`) — 직렬화 시점에만 백엔드 스키마에 맞춘다 |
| 응답 타입 | `*Response` 접미사 (`InventoryListResponse`) |
| 요청 바디 타입 | `*Payload` 접미사 (`InventoryItemPayload`) |
| 반환 타입 | `async` 함수는 `Promise<T>` 를 **명시**한다 |
| nullable 필드 | 백엔드가 null 을 보낼 수 있으면 `string \| null` 로 정확히 표기 (`?:` 로 뭉개지 않음) |

컴포넌트에 직접 `fetch` 를 넣지 않는다 (`lucky/CLAUDE.md` 참조).

---

### 11. 에러 처리 타이핑

`catch` 바인딩은 `unknown` 이다 (`useUnknownInCatchVariables`, strict 포함). 프로퍼티에 바로 접근하지 않는다.

```ts
// ✅ 값이 필요 없으면 바인딩 자체를 생략
try {
  res = await fetch(url);
} catch {
  throw new Error("서버에 연결할 수 없습니다.");
}

// ✅ 값이 필요하면 좁힌다
try {
  await save();
} catch (err) {
  const message = err instanceof Error ? err.message : "알 수 없는 오류";
  toast.error(message);
}

// ❌
catch (err) {
  toast.error(err.message); // err 은 unknown
}
```

---

### 12. 체크리스트 — TypeScript 코드 작성 후 필수

```bash
cd lucky && npm run lint
cd lucky && npx tsc --noEmit
cd lucky && npx prettier --write .
```

**린터 에러는 절대 무시하지 않는다. 수정 후 완료 보고한다.**

---

### 자주 하는 실수 (하지 말 것)

| 실수 | 올바른 방향 |
|------|------------|
| 타입을 모를 때 `any` 로 우회 | 좁은 `type` 선언 또는 `unknown` + 내로잉 (§2) |
| 새 코드에서 `interface` 사용 | `type` 별칭 (§3) |
| `React.FC<Props>` | `export function Name({ ... }: Props)` (§4) |
| 타입을 값 임포트로 가져옴 | `import type` (§5) |
| `user!.email` | 내로잉 또는 `?.` / `??` (§6) |
| `process.env.X \|\| "기본값"` | `??` 사용 (§6) |
| 디버깅용 `console.log` 잔류 | 제거 — `no-console: error` (§8) |
| 컴포넌트 파일에 API 타입 선언 | `lib/*-api.ts` 에서 `export type` (§10) |
| 백엔드 필드를 camelCase 로 변환 | snake_case 유지 (§10) |
| `catch (err) { err.message }` | `err instanceof Error` 로 좁히기 (§11) |
| 기존 `interface` 를 요청 없이 `type` 으로 일괄 변환 | 손대지 않는다 — Surgical Changes |
