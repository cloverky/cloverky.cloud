# 005 — Morningstar 전략: LangChain 기반 맞춤형 금융 인사이트

> 선행 문서: [[003-langchain-harness]] (LangChain 사용 규칙), [[002-neo4j-harness]] (그래프 저장 규칙)
> 이 문서는 **전략 → 구현 매핑 → 검증**을 잇는 슬라이스 계약서다.

---

## 1. 전략 (레퍼런스 사례)

LangChain은 고객 요구에 맞춘 맞춤형 솔루션을 제공해 고객 경험을 크게 개선할 수 있다.
금융 서비스 제공업체 **Morningstar**는 LangChain으로 방대한 재무 보고서와 시장 데이터를 분석해
**사용자 맞춤형 금융 인사이트를 제공하는 인텔리전스 엔진**을 만들었다.
이 시스템은 금융 전문가가 복잡한 질문에 정확한 답을 얻도록 돕고,
LangChain의 **실시간 데이터 통합**과 **맞춤형 프롬프팅**을 핵심으로 활용한다.

### 전략을 4개의 구현 요구로 분해

| # | 전략 요소 | 구현 요구 |
|---|-----------|-----------|
| 1 | 방대한 재무 보고서 분석 | 문서를 적재·검색 가능한 형태로 보관하고, 질문에 맞는 발췌만 컨텍스트로 넣는다 |
| 2 | 시장 데이터 (실시간 통합) | 요청 시점에 외부 시세를 조회해 프롬프트에 결합한다 |
| 3 | 맞춤형 프롬프팅 | 투자자 프로필(위험 성향·기간·관심사)에 따라 **지시문 자체가 달라진다** |
| 4 | 복잡한 질문에 정확한 답 | 근거·출처를 함께 반환하고, 데이터가 없으면 없다고 답하게 강제한다 |

---

## 2. 구현 매핑 (파일 단위)

```
POST /api/v1/morningstar/insights
  → morningstar_router.py                     [adapter/inbound/api/v1]
      to_insight_query()                      [schemas/morningstar_schema.py]
  → get_morningstar_use_case()                [dependencies/morningstar_provider.py]
  → LangchainMorningstarInteractor            [app/use_cases]
      ├─ asyncio.gather ─┬ MarketDataPort         → YahooMarketDataGateway      [adapter/outbound/market]
      │                  └ ResearchRepositoryPort → ResearchDocumentGraphRepository [adapter/outbound/repositories]
      ├─ profile_directive() / market_context() / research_context()  [app/use_cases/_morningstar_prompt.py]
      └─ InsightChainPort              → MorningstarInsightChain      [adapter/outbound/langchain]
                                              prompt | RunnableLambda | StrOutputParser
                                              RunnableLambda → ChatLlmPort (EXAONE → Ollama 폴백)
  → to_insight_response()                     [schemas/morningstar_schema.py]
  → JSON (answer, quotes, sources, generated_at)
```

| 전략 요소 | 구현 |
|-----------|------|
| ① 재무 보고서 | PDF 파이프라인([[002-neo4j-harness]])이 적재한 Neo4j `(:PdfDocument)` 노드를 키워드로 검색 (`ResearchDocumentGraphRepository`). 상한 `_RESEARCH_LIMIT = 5` |
| ② 실시간 시장 데이터 | Yahoo Finance 공개 chart 엔드포인트(API 키 불필요). 티커별 병렬 조회, **일부 실패는 무시하고 나머지로 진행** |
| ③ 맞춤형 프롬프팅 | `profile_directive()`가 프로필 → 지시문 문자열을 만들고 `ChatPromptTemplate`의 `{profile_directive}` 변수로 주입 |
| ④ 정확성 | 시스템 프롬프트가 "제공된 데이터만 사용 / 수치엔 출처 명시 / 근거 부족은 부족하다고 답" 을 강제. 응답에 `sources`, `quotes` 동봉 |

### 맞춤형 프롬프팅이 실제로 하는 일

| 프로필 | 주입되는 지시문 |
|--------|----------------|
| `conservative` + `short` | 원금 보존 최우선, 하방 위험·변동성·배당 안정성 우선 / 판단 기준 수주~수개월, 단기 촉매 중심 |
| `aggressive` + `long` | 성장성·모멘텀 우선, 최대 낙폭 명시 / 판단 기준 3년 이상, 구조적 경쟁우위 중심 |
| `interests` 있음 | "관심 분야는 …이며 이를 우선 연결한다" 추가 |

**같은 질문·같은 데이터라도 프로필이 다르면 시스템 프롬프트가 달라진다** — 이것이 이 전략의 핵심이다.

---

## 3. 요청·응답 계약

```bash
curl -X POST http://localhost:8000/api/v1/morningstar/insights \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "마이크로소프트의 AI 인프라 투자가 단기 실적에 부담인가?",
    "tickers": ["MSFT", "NVDA"],
    "profile": {"risk_appetite": "balanced", "horizon": "mid", "interests": ["AI 인프라"]}
  }'
```

| 필드 | 설명 |
|------|------|
| `question` | 금융 전문가의 질문 (2자 이상) |
| `tickers` | 실시간 시세 조회 대상. 대문자로 정규화되며 조회 실패 종목은 결과에서 빠진다 |
| `profile.risk_appetite` | `conservative` \| `balanced` \| `aggressive` |
| `profile.horizon` | `short` \| `mid` \| `long` |
| `profile.interests` | 관심 섹터·테마 (지시문에 반영) |

응답: `answer`(요약/근거/리스크/다음 확인 사항), `quotes`(사용된 시세), `sources`(근거 문서명), `generated_at`.

| 상태 코드 | 조건 |
|-----------|------|
| 400 | 빈 질문 등 입력 오류 (`ValueError`) |
| 502 | 모든 LLM 게이트웨이 실패 (`RuntimeError`) |

---

## 4. 설계 판단과 그 이유

| 판단 | 이유 |
|------|------|
| LangChain을 **어댑터에만** 둔다 | 유스케이스가 프레임워크를 모르게 유지 ([[003-langchain-harness]] §6) |
| 모델 호출을 `RunnableLambda`로 감싼다 | 프로바이더 패키지 미설치. 동시에 EXAONE↔Ollama 교체가 체인 수정 없이 된다 |
| 외부 소스 호출을 `asyncio.gather`로 병렬화 | LangChain의 알려진 단점(소스가 늘수록 지연 누적)에 대한 직접 대응 |
| 시세 실패를 예외로 올리지 않는다 | 한 종목 장애가 인사이트 전체를 막으면 안 된다. 대신 프롬프트에 "시세 없음"을 명시 |
| 리서치 0건이면 최신 문서로 대체 | 근거 없이 생성되는 답변을 줄인다 |
| 키워드 추출을 순수 함수로 분리 | 검색 규칙을 테스트 가능하게 유지 (`_morningstar_prompt.keywords_of`) |

---

## 5. 검증

```bash
# 1) 정적 검사
cd clover && ruff check apps/admin && ruff format apps/admin --check

# 2) 라우트 등록 확인
curl -s localhost:8000/openapi.json | python3 -c \
  "import sys,json;print([p for p in json.load(sys.stdin)['paths'] if 'morningstar' in p])"

# 3) LLM 스텁 검증 — 실시간 시세·Neo4j는 실제, 체인/프롬프팅만 검사
#    ChatLlmPort 스텁을 주입해 렌더링된 시스템 프롬프트를 직접 확인한다
```

| 항목 | 성공 기준 | 실측 (2026-07-27) |
|------|-----------|-------------------|
| 실시간 시세 | 유효 티커는 가격·등락률 반환 | MSFT 381.70 USD (+0.03%), NVDA 206.84 USD (−0.92%) |
| 잘못된 티커 | 전체 실패 없이 스킵 + 경고 로그 | `NO_SUCH_TICKER_XYZ` 404 → 로그만 남고 나머지 진행 |
| 리서치 검색 | `(:PdfDocument)`에서 근거 반환 | `sources: ["sample.pdf"]` |
| 맞춤형 프롬프팅 | 프로필별로 시스템 프롬프트가 달라짐 | 보수·단기 ↔ 공격·장기 지시문 상이 확인 |
| 체인 조립 | `prompt \| RunnableLambda \| StrOutputParser` 가 문자열 반환 | 통과 |

---

## 6. 운영 시 주의

- **지연**: 로컬 LLM(Ollama qwen3:4b)은 콜드 스타트 포함 수 분이 걸린다. `OLLAMA_TIMEOUT_SECONDS`로 조정.
  EXAONE(vLLM, `EXAONE_BASE_URL`)이 떠 있으면 훨씬 빠르며 폴백은 방어용이다.
- **컨텍스트 상한**: 리서치 발췌 5건 고정. 늘릴 때는 지연·토큰 비용을 함께 본다.
- **외부 API 의존**: Yahoo 엔드포인트는 비공식이다. 차단·스키마 변경 시
  `MARKET_DATA_BASE_URL`로 대체하거나 `MarketDataPort` 구현체만 교체한다(포트 불변).
- **투자 자문 아님**: 응답은 정보 제공용이다. 프로덕션 노출 시 면책 문구를 응답에 포함할 것.
