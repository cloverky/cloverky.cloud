# lucky — 프론트엔드 CLAUDE.md

> 루트 원칙: [`../CLAUDE.md`](../CLAUDE.md) 를 먼저 읽는다.

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS + shadcn/ui (`components.json`) |
| 백엔드 API | `http://localhost:8000` (개발) / Docker Compose 서비스명 `backend` |
| 배포 | Docker Compose (`lucky/Dockerfile`) |

---

## 디렉터리 구조

```
lucky/
├── app/                         # Next.js App Router
│   ├── api/gemini/chat/         # Gemini 채팅 Route Handler
│   ├── features/[slug]/         # 기능 상세 페이지 (동적 라우트)
│   ├── lesson/                  # 레슨 페이지
│   ├── login/                   # 로그인 페이지
│   ├── titanic/                 # Titanic ML 데모 페이지
│   ├── globals.css
│   ├── layout.tsx               # 루트 레이아웃
│   └── page.tsx                 # 홈(랜딩) 페이지
├── components/
│   ├── api/                     # 서버 컴포넌트용 데이터 패칭 래퍼
│   ├── ui/                      # shadcn/ui 기본 컴포넌트
│   ├── app-shell.tsx            # 전체 레이아웃 Shell
│   ├── auth-context.tsx         # 인증 Context Provider
│   ├── gemini-chat-*.tsx        # Gemini 채팅 UI
│   ├── inventory-feature-page.tsx
│   ├── smith-captain-chat.tsx   # Titanic Smith/Captain 채팅
│   ├── titanic-*.tsx            # Titanic 관련 컴포넌트
│   └── (기타 UI 컴포넌트)
├── hooks/                       # 커스텀 React 훅
├── lib/                         # API 클라이언트 · 유틸리티
│   ├── auth-api.ts
│   ├── chat-api.ts
│   ├── inventory-api.ts
│   ├── weather-api.ts
│   ├── feature-pages.ts
│   ├── header-nav.ts
│   └── utils.ts
└── _claude/                     # Claude 보조 문서 (AI 전용)
```

---

## 백엔드 API 연동 규칙

- 모든 백엔드 API 경로:
  - fridge: `/inventory`, `/foods`, `/categories`, `/receipts`
  - titanic: `/api/titanic/{name}/...`
- API 호출은 `lib/` 아래 클라이언트 모듈에서 관리. 컴포넌트에 직접 `fetch` 넣지 않는다.
- fridge API는 `X-User-Email` 헤더로 사용자 식별.
- Gemini 채팅은 `app/api/gemini/chat/` Route Handler를 통해 서버 측에서 호출.

---

## 컴포넌트 규칙

- shadcn/ui 컴포넌트를 우선 사용한다. 없을 때만 직접 작성한다.
- 컴포넌트는 단일 책임: UI 렌더링만 담당, 데이터 패칭은 훅 · 서버 컴포넌트에 위임.
- `"use client"` 는 필요한 경우에만 붙인다. 기본은 서버 컴포넌트.
- Context Provider는 `components/` 루트에 둔다 (`auth-context.tsx`, `gemini-chat-context.tsx`).

---

## 상태 관리

- 전역 인증 상태: `auth-context.tsx` (`AuthContext`)
- Gemini 채팅 상태: `gemini-chat-context.tsx`
- 로컬 UI 상태: `useState` / `useReducer` 로 컴포넌트 내 처리.
- 서버 상태 캐싱 라이브러리(SWR·React Query)는 현재 미도입 — 필요 시 별도 논의.

---

## 환경 변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_API_URL` | 백엔드 base URL |
| `GOOGLE_API_KEY` | Gemini Route Handler 전용 (서버 전용, `NEXT_PUBLIC_` 접두사 금지) |

`.env.local` 에 정의. Docker 환경에서는 `docker-compose.yaml` 참조.

---

## 자주 하는 실수 (하지 말 것)

| 실수 | 올바른 방향 |
|------|------------|
| 컴포넌트에 직접 `fetch` 작성 | `lib/` API 클라이언트 사용 |
| `GOOGLE_API_KEY` 를 클라이언트에 노출 | Route Handler (`app/api/`) 에서만 사용 |
| shadcn/ui 없이 인라인 스타일 | shadcn/ui → Tailwind 순으로 우선 적용 |
| `"use client"` 남발 | 서버 컴포넌트 기본, 이벤트·훅 필요 시에만 추가 |
| `_claude/` 문서를 배포 대상으로 포함 | AI 보조용 전용, 앱 코드와 무관 |
