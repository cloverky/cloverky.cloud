# 006 — LangChain 전략: Elastic(보안 어시스턴트) · NCL(여행 추천)

> 이 문서는 **전략 문서**다. 실제 코드는 포함하지 않는다.
> 구현 시 참고: [[003-langchain-harness]] (LangChain 사용 규칙), [[002-neo4j-harness]] (그래프 저장이 필요할 때),
> [[005-langcjain-morningstar-strategy]] (이미 구현된 슬라이스 — 게이트웨이·체인 재사용 대상)

---

## 1. 전략 (레퍼런스 사례)

### 1.1 Elastic — 운용 효율성 향상

LangChain의 다양한 데이터 소스 통합·실시간 처리 기능을 활용해, Elastic은 보안 분석가를 지원하는
AI 어시스턴트를 만들었다. 이 어시스턴트는 **보안 경고를 요약**하고, **워크플로우를 제안**하며,
**쿼리를 생성·변환**해 보안 팀의 업무 효율성을 끌어올린다. 대량 데이터를 실시간으로 처리·분석하는
능력이 핵심이다.

### 1.2 NCL — 최적화된 여행 계획 제공

LangChain의 맞춤형 프롬프팅·파인튜닝 기능을 활용해, 노르웨이 크루즈 라인(NCL)은 고객이 이상적인
크루즈 여행을 계획하도록 돕는 AI 어시스턴트를 만들었다. 고객의 **선호도와 탐색 기록**을 기반으로
맞춤형 추천을 제공하며, 실시간으로 변화하는 고객 요구에 대응한다.

### 두 사례의 공통 골격과 차이

| 항목 | Elastic | NCL |
|------|---------|-----|
| 입력 데이터 | 보안 경고(alert) 스트림 | 고객 선호도 + 탐색 이력 |
| LangChain의 역할 | 데이터 통합·실시간 처리 (§1.1 유형) | 맞춤형 프롬프팅·파인튜닝 (§1.3 유형) — [[003-langchain-harness]] |
| 출력 | 요약, 워크플로우 제안, 쿼리 생성/변환 | 개인화된 크루즈 옵션 추천 + 근거 |
| 근본 패턴 | "원시 데이터 다건 → 구조화된 행동 지침" | "프로필+이력 → 개인화된 지시문 → 추천" |

두 사례 모두 **[[005-langcjain-morningstar-strategy]]와 동일한 골격**을 재사용할 수 있다:
외부/도메인 데이터를 병렬 수집 → 프로필·컨텍스트로 프롬프트 조립 → LCEL 체인(`prompt | RunnableLambda | Parser`)
→ `ChatLlmPort`(EXAONE → Ollama 폴백) 호출 → 구조화된 응답 반환.

---

## 2. Elastic형 — 보안 인사이트 어시스턴트 (설계안)

### 2.1 요구 분해

| # | 요구 | 설계 대응 |
|---|------|-----------|
| 1 | 보안 경고 요약 | 다건 알림 → 청크 map-reduce 요약 ([[002-neo4j-harness]] 방식 아님, [[005-langcjain-morningstar-strategy]]의 map-reduce 재사용) |
| 2 | 워크플로우 제안 | LLM 출력에 `suggested_workflow: list[str]` 필드 강제 (구조화 출력, §2.4 참고) |
| 3 | 쿼리 생성·변환 | 자연어 질의 → 대상 쿼리 언어(KQL/Lucene/ES DSL) 변환. **실행은 하지 않고 문자열만 생성** (읽기 전용 하네스 원칙) |
| 4 | 실시간 대량 처리 | 알림 조회는 페이지네이션 + 상한, 병렬 처리는 [[003-langchain-harness]] §3 원칙(성능 대응) 따름 |

### 2.2 헥사고날 슬라이스 (제안)

```
app/dtos/security_insight_dto.py
  SecurityAlert(id, severity, source, message, occurred_at)
  AlertInsightQuery(alert_ids: list[str], question: str | None)
  AlertInsight(summary, suggested_workflow: list[str], generated_query: str, based_on: list[str])

app/ports/input/security_insight_use_case.py
  SecurityInsightUseCase.summarize_alerts(query: AlertInsightQuery) -> AlertInsight

app/ports/output/
  alert_source_port.py       AlertSourcePort.fetch(alert_ids) -> list[SecurityAlert]
  security_chain_port.py     SecurityChainPort.run(alerts_context, question) -> AlertInsight 형 원시 텍스트

app/use_cases/
  _security_prompt.py        alerts_context(), severity 우선순위 정렬 등 순수 함수
  security_insight_interactor.py

adapter/outbound/
  security/elastic_alert_gateway.py   # Elastic API 또는 목 데이터 소스 — 실제 연동 전까지는 미구현
  langchain/security_insight_chain.py # prompt | RunnableLambda(ChatLlmPort) | 구조화 파서

adapter/inbound/api/v1/security_insight_router.py
  POST /api/v1/security/alerts/insight
```

### 2.3 프롬프트 설계 방향

시스템 프롬프트는 3개 섹션을 **분리된 필드**로 강제한다 (자유 텍스트 한 덩어리 금지):

```
## 요약
## 제안 워크플로우 (번호 목록)
## 쿼리 (코드 블록, 언어명 명시)
```

구조가 무너지면(파서 실패) **재시도 1회 후 502**로 처리한다 — [[003-langchain-harness]] §6 "체인 실패를 500으로 노출 금지" 원칙.

### 2.4 안전 경계 (중요)

- 생성된 쿼리는 **문자열 반환만** 하고 절대 자동 실행하지 않는다. 실행은 사람이 검토 후 별도 액션으로.
- 알림 원문에 포함될 수 있는 PII/시크릿은 요약에 그대로 노출되지 않도록 프롬프트에 마스킹 지시를 넣는다.
- 이 경계는 실제 구현 시 **타협 불가** 조건으로 못박는다.

---

## 3. NCL형 — 여행 추천 어시스턴트 (설계안)

### 3.1 요구 분해

| # | 요구 | 설계 대응 |
|---|------|-----------|
| 1 | 고객 선호도 반영 | `TravelerProfile`(선호 목적지 유형, 예산대, 동반자 구성 등) → 맞춤형 지시문 — [[005-langcjain-morningstar-strategy]]의 `profile_directive()` 패턴 그대로 재사용 |
| 2 | 탐색 기록 반영 | 최근 조회·검색 이력을 컨텍스트로 요약해 투입 (전체 로그 원문 투입 금지 — 토큰 폭증) |
| 3 | 실시간 대응 | 크루즈 옵션(항로·일정·가격)은 요청 시점에 조회 — Morningstar의 `MarketDataPort` 병렬 조회 패턴과 동일 |
| 4 | 맞춤형 추천 | 추천 이유를 프로필·이력에 근거해 명시 (근거 없는 추천 금지 — [[005-langcjain-morningstar-strategy]] §4 정확성 원칙과 동일) |

### 3.2 헥사고날 슬라이스 (제안)

```
app/dtos/travel_recommendation_dto.py
  TravelerProfile(preferred_regions, budget_tier, party_type, interests)
  BrowsingEvent(item_id, item_type, viewed_at)
  CruiseOption(id, route, depart_at, price, cabin_type)
  RecommendationQuery(traveler_id, profile, recent_events: list[BrowsingEvent])
  TravelRecommendation(picks: list[CruiseOption], reasoning: str, based_on: list[str])

app/ports/input/travel_recommendation_use_case.py
  TravelRecommendationUseCase.recommend(query) -> TravelRecommendation

app/ports/output/
  cruise_catalog_port.py        CruiseCatalogPort.search(profile) -> list[CruiseOption]
  browsing_history_port.py      BrowsingHistoryPort.recent(traveler_id, limit) -> list[BrowsingEvent]
  recommendation_chain_port.py  RecommendationChainPort.run(profile_directive, catalog_context, history_context) -> str

app/use_cases/
  _travel_prompt.py              profile_directive(), history_context(), catalog_context() 순수 함수
  travel_recommendation_interactor.py   # asyncio.gather로 catalog·history 병렬 수집

adapter/outbound/
  travel/mock_cruise_catalog_gateway.py   # 실제 크루즈 재고 API 연동 전 임시 소스 (도메인 데이터 부재 — §4 참고)
  repositories/browsing_history_repository.py  # 이력 저장소 — Neo4j 그래프 재사용 시 [[002-neo4j-harness]] 규칙 적용
  langchain/travel_recommendation_chain.py

adapter/inbound/api/v1/travel_recommendation_router.py
  POST /api/v1/travel/recommendations
```

### 3.3 탐색 기록의 그래프화 여부

탐색 기록·선호도를 "고객 ↔ 크루즈/목적지" 관계로 다루면 [[002-neo4j-harness]]의 그래프 모델이 잘 맞는다:

```
(:Traveler {name})-[:VIEWED {at}]->(:CruiseOption {name, route})
(:Traveler {name})-[:PREFERS {weight}]->(:Region {name})
```

- 라벨: `Traveler`, `CruiseOption`, `Region` (PascalCase 단수)
- 관계: `VIEWED`, `PREFERS` (UPPER_SNAKE_CASE 동사)
- 관계 속성 `at`, `weight`는 노드로 분리하지 않는다 ([[002-neo4j-harness]] §1 판단 기준)

단, 이는 **실제 구현 시점에 도메인 데이터가 준비된 후** 결정한다. 지금은 방향만 남긴다.

---

## 4. 공통 인프라 (구현 시 재사용)

두 슬라이스 모두 새로 만들지 않고 기존 것을 그대로 쓴다.

| 구성 요소 | 재사용 대상 | 위치 |
|-----------|-------------|------|
| LLM 게이트웨이 | `ChatLlmPort` + `FallbackChatGateway`(EXAONE→Ollama) | `admin/adapter/outbound/llm/chat_gateway.py` |
| LCEL 조립 패턴 | `prompt \| RunnableLambda \| Parser`, 생성자 1회 조립 | `admin/adapter/outbound/langchain/morningstar_insight_chain.py` |
| 병렬 소스 수집 | `asyncio.gather` | `LangchainMorningstarInteractor.generate_insight` |
| 맞춤형 지시문 패턴 | `profile_directive()`류 순수 함수 | `admin/app/use_cases/_morningstar_prompt.py` |
| 그래프 upsert (탐색 기록 등) | `star_craft`의 `GraphRepository` 포트 | [[002-neo4j-harness]] §4 |

**새로 필요한 것은 도메인 데이터 소스뿐**이다 — Elastic 알림 소스, NCL 크루즈 카탈로그/탐색 기록.
이 두 소스는 이 저장소에 존재하지 않으므로, 실제 구현 착수 시 **목(mock) 데이터로 시작할지
실제 연동을 먼저 붙일지**를 별도로 정한다.

---

## 5. 구현 착수 시 확인할 것 (미결 사항)

| 미결 사항 | 결정 필요 시점 |
|-----------|---------------|
| Elastic 알림을 실제 Elastic API에서 받을지, 목 데이터로 시작할지 | `alert_source_port.py` 구현체 작성 전 |
| 쿼리 생성 대상 언어(KQL / Lucene / ES DSL 중 어느 것을 기본값으로) | 프롬프트 확정 전 |
| NCL 크루즈 카탈로그 데이터 소스(자체 DB vs 외부 API) | `cruise_catalog_port.py` 구현체 작성 전 |
| 탐색 기록을 Neo4j로 둘지 Postgres로 둘지 | §3.3 방향 확정 전 |

이 문서는 **위 미결 사항이 정해지기 전까지는 설계안(전략) 상태로 유지**한다.
실제 코드 작성은 별도 요청 시 진행한다.
