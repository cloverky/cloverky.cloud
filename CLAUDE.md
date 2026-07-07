LLM의 일반적인 코딩 실수를 줄이기 위한 행동 지침이다. 프로젝트별 지침이 있을 경우 본 가이드라인과 병합하여 사용한다.

트레이드오프: 본 지침은 속도보다 신중함에 우선순위를 둔다. 사소한 작업은 상황에 맞게 판단한다.

---

## 하네스 — 코드 작성 후 필수 실행 (Harness Engineering)

**린터 에러는 절대 무시하지 않는다. 반드시 수정 후 완료 보고한다.**

### Flutter (`fortune/`) 작업 후

```bash
cd fortune && flutter analyze --fatal-infos
cd fortune && dart format --set-exit-if-changed .
```

### Python (`clover/`) 작업 후

```bash
cd clover && ruff check . --fix
cd clover && ruff format .
cd clover && mypy . --config-file pyproject.toml
```

### Next.js (`lucky/`) 작업 후

```bash
cd lucky && npm run lint
cd lucky && npx prettier --write .
```

### 온톨로지 / MD 작업 후

```bash
python scripts/validate-harness.py
```

### 전체 하네스 (커밋 전 자동 실행)

```bash
# 최초 1회 설치
pip install pre-commit && pre-commit install

# 수동 전체 실행
pre-commit run --all-files
```

---

## 프로젝트 정체성 (Project Identity — 최우선 맥락)

> **모든 작업의 기본 맥락으로 삼는다.**

이 프로젝트는 **AI 기반 식재료 관리 서비스**다.

- AI가 냉장고 속 식재료를 스스로 인식하고 기억한다.
- 유통기한이 가장 임박한 재료를 최우선으로 분류해 버려지는 음식물을 최소화한다.
- 지금 당장 소비해야 하는 재료들의 조합으로 최적의 맞춤형 레시피를 제안한다.

기능 설계, 데이터 모델링, UI/UX, API 설계 등 모든 의사결정은 이 정체성과 일치해야 한다.

---

## 하위 문서 (Sub-documents)

작업 영역에 해당하는 문서를 반드시 먼저 읽는다.

| 영역 | 문서 |
|------|------|
| 백엔드 (FastAPI · Python) | `clover/CLAUDE.md` |
| 프론트엔드 (Next.js · TypeScript) | [`lucky/CLAUDE.md`](./lucky/CLAUDE.md) |
| 모바일 (Flutter · Dart) | [`fortune/CLAUDE.md`](./fortune/CLAUDE.md) |
| Titanic 앱 (bounded context) | [`clover/apps/titanic/_docs/CLAUDE.md`](./clover/apps/titanic/_docs/CLAUDE.md) |

---

## 문서 배치 규칙 (Documentation Placement)

> **모든 `.md` 문서는 아래 규칙에 따라 배치한다. 예외는 사용자가 명시적으로 승인한 경우에만 허용된다.**

| 문서 성격 | 위치 | 예시 |
|-----------|------|------|
| **공통** — 전체 프로젝트에 걸친 아키텍처, ADR, 용어집, API 계약 | `_docs/` | `_docs/architecture.md` |
| **백엔드** — FastAPI · Python · clover 서비스 관련 | `clover/_docs/` | `clover/_docs/domain-model.md` |
| **프론트엔드** — Next.js · TypeScript · lucky 관련 | `lucky/_docs/` | `lucky/_docs/design-system.md` |
| **모바일** — Flutter · Dart · fortune 관련 | `fortune/_docs/` | `fortune/_docs/navigation.md` |

### 판단 기준

- 둘 이상의 영역에 걸치면 → `_docs/`
- 특정 bounded context 전용이면 → 해당 앱의 `_docs/`
- `CLAUDE.md` / `AGENTS.md`는 각 앱 루트에 위치 (이 규칙의 예외)

---

## Top-Level Architecture Mandate (binding — English)

> **Priority:** This section is the highest-level architecture contract for this repository.
> Claude and all coding agents MUST read, internalize, and obey it before writing or refactoring code.
> When this section conflicts with ad-hoc suggestions, **this section wins** unless the user explicitly overrides it in the current message.

### Mission

You are building **clover** using **Karpathy-style harness engineering**: treat the LLM as a component inside a reliable system, not as the system itself. Progress flows through **structured context**, **explicit contracts**, **verifiable steps**, and **durable project memory** — not through one-off prompts or implicit conventions.

Implement a **Wiki + LLM PKS (Project Knowledge System)**:

| Pillar | Responsibility |
|--------|----------------|
| **Wiki** | Human-readable source of truth: architecture decisions, domain glossary, API contracts, folder rules, ADRs. Update the wiki when behavior or structure changes. |
| **LLM** | Executes tasks only within retrieved context from the wiki, `CLAUDE.md`, `AGENTS.md`, and the codebase. Do not invent architecture that contradicts written project knowledge. |
| **PKS** | Persistent, queryable project knowledge that bridges wiki docs and code: stable naming, bounded contexts, ports/adapters map, and handoff notes so the next agent session can continue without rediscovery. |

Before non-trivial work: **retrieve relevant wiki/PKS context → state assumptions → implement → verify → update wiki/PKS if the system changed.**

### Mandatory architecture stack

Combine these three models **at every bounded context** (e.g. `fridge`, `titanic`). Do not pick one and ignore the others.

1. **DDD (Domain-Driven Design)**
   - Identify bounded contexts, ubiquitous language, aggregates, and domain rules.
   - Domain logic lives in the center; infrastructure stays at the edges.
   - No anemic domain: business rules belong in domain/use-case layers, not in routers or ORM models.

2. **Clean Architecture**
   - Dependencies point **inward only**.
   - Outer layers (frameworks, DB, HTTP, LLM SDKs) depend on inner abstractions — never the reverse.
   - Use explicit boundaries: entities/domain rules → use cases → interface adapters → frameworks.

3. **Hexagonal Architecture (Ports & Adapters)**
   - **Inbound adapters**: HTTP routers, CLI, message consumers.
   - **Outbound adapters**: repositories, ORM, external APIs, file/LLM gateways.
   - **Ports**: ABC interfaces (`UseCase`, `Repository`, etc.) that adapters and application core share.
   - **Composition root**: `dependencies/` (DI factories) wires concrete adapters to ports.

### SOLID (non-negotiable)

| Principle | Rule in this repo |
|-----------|-------------------|
| **S** — Single Responsibility | One reason to change per module/class: router = HTTP, interactor = orchestration, repository = persistence, ORM = table mapping. |
| **O** — Open/Closed | Extend via new port implementations and adapters; avoid modifying stable core contracts without explicit request. |
| **L** — Liskov Substitution | Inject and type-hint **ports**, not concrete adapters. |
| **I** — Interface Segregation | Small, slice-specific ports (`InventoryUseCase`, `JamesDirectorRepository`); no god interfaces. |
| **D** — Dependency Inversion | High-level modules depend on abstractions; concretes are assembled only in `dependencies/` or `main.py`. |

### Harness engineering workflow (agent checklist)

1. **Read** `CLAUDE.md`, `AGENTS.md`, and relevant wiki/PKS notes.
2. **Locate** the bounded context and slice (adapter / app / domain / dependencies).
3. **Design** ports first, then interactors, then adapters — never start from ORM or router fat handlers.
4. **Implement** with minimal diff; match existing naming and folder layout.
5. **Verify** with import/run checks and stated success criteria.
6. **Record** durable changes in wiki/PKS (or flag what the user should commit to docs).

### Anti-patterns (reject immediately)

- Business logic in FastAPI routers or SQLAlchemy models
- Adapters imported directly inside interactors
- New `domain/` top-level folders that break the established app layout without user approval
- Skipping ports "because the slice is small"
- Path prefixes that violate the `fridge.*` / `clover.core.*` convention
- One-shot LLM context with no wiki/PKS update after architectural change

---

## 1. 구현 전 사고 (Think Before Coding)

가정하지 않는다. 모호함을 숨기지 않는다. 트레이드오프를 명확히 밝힌다.

구현을 시작하기 전 다음을 준수한다:

- 자신의 가정을 명시적으로 기술한다. 불확실한 경우 질문한다.
- 해석의 여지가 여러 가지라면 임의로 선택하지 말고 대안들을 제시한다.
- 더 간단한 접근 방식이 있다면 제안한다. 정당한 사유가 있다면 사용자의 요청에 반대 의견을 제시한다.
- 불분명한 부분이 있다면 작업을 중단한다. 혼란스러운 부분을 구체적으로 언급하며 질문한다.

## 2. 단순성 우선 (Simplicity First)

- 문제를 해결하는 최소한의 코드만 작성한다. 추측에 기반한 코드는 배제한다.
- 요청되지 않은 기능은 추가하지 않는다.
- 일회성 코드를 위해 추상화 계층을 만들지 않는다.
- 요청되지 않은 유연성이나 설정 가능성을 고려하지 않는다.
- 발생 불가능한 시나리오에 대한 예외 처리를 하지 않는다.
- 200줄의 코드를 50줄로 줄일 수 있다면 코드를 다시 작성한다.
- "시니어 엔지니어가 보기에 이 코드가 지나치게 복잡한가?"라고 자문한다. 그렇다면 단순화한다.

## 3. 정밀한 수정 (Surgical Changes)

필요한 부분만 수정한다. 본인이 만든 코드의 뒷정리만 수행한다.

기존 코드를 편집할 때 다음을 준수한다:

- 인접한 코드, 주석, 포맷을 임의로 개선하지 않는다.
- 망가지지 않은 부분을 리팩토링하지 않는다.
- 본인의 스타일과 다르더라도 기존 스타일을 따른다.
- 작업과 무관한 데드 코드를 발견하면 보고하되 직접 삭제하지 않는다.

수정으로 인해 사용되지 않게 된 요소가 발생할 경우:

- 본인의 수정으로 인해 불필요해진 임포트, 변수, 함수는 제거한다.
- 기존에 존재하던 데드 코드는 요청이 없는 한 그대로 둔다.
- 테스트 기준: 변경된 모든 라인은 사용자의 요청사항과 직접적으로 연결되어야 한다.

## 4. 목표 중심 실행 (Goal-Driven Execution)

성공 기준을 정의한다. 검증될 때까지 반복한다.

작업을 검증 가능한 목표로 변환한다:

- "유효성 검사 추가" → "잘못된 입력에 대한 테스트 작성 후 통과 확인"
- "버그 수정" → "버그를 재현하는 테스트 작성 후 통과 확인"
- "X 리팩토링" → "리팩토링 전후의 테스트 통과 확인"

다단계 작업의 경우 간략한 계획을 수립한다:

1. [단계] → 검증: [확인 사항]
2. [단계] → 검증: [확인 사항]
3. [단계] → 검증: [확인 사항]

성공 기준이 명확해야 독립적인 작업이 가능하다. "작동하게 만들기"와 같은 모호한 기준은 불필요한 재질의를 야기한다.

지침 작동 확인: Diff 내 불필요한 변경 감소, 복잡성으로 인한 재작성 빈도 감소, 구현 전 질문을 통한 명확한 의사결정 증대.
