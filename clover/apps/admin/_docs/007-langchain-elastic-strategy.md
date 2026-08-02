---
type: spoke
app: silicon_valley
links:
  - star_craft
---

# LangChain 전략 — Elastic: 운용 효율성 향상

LangChain은 다양한 데이터 소스와의 통합을 통해 실시간으로 데이터를 처리하고 분석할 수 있어,
비즈니스 운영의 효율성을 크게 향상합니다. Elastic은 보안 분석가들을 지원하기 위해 LangChain을
활용해 AI 어시스턴트를 개발했습니다. 이 AI 어시스턴트는 보안 경고를 요약하고, 워크플로우를
제안하며, 쿼리 생성과 변환을 수행하여 보안 팀의 업무 효율성을 크게 향상합니다. 이 애플리케이션은
실시간으로 대량의 데이터를 처리하고 분석하여 보안 작업을 지원하는데, LangChain의 데이터 통합 및
처리 기능이 중요한 역할을 하고 있습니다.

## 전략 설계

[003-langchain-harness.md](003-langchain-harness.md)의 절대 규칙을 따르고,
[005](005-langchain-morningstar-strategy.md)/[006](006-langchain-ncl-strategy.md)과 동일한
"실시간 조회 → 맞춤형 프롬프팅 → LangChain 체인" 구조를 재사용한다. 컨텍스트만 "보안 경고(알럿)
스트림"으로 바뀐다.

| 전략 요소 | 설계 |
| --------- | ---- |
| 실시간 데이터 통합·처리 | `ElasticAlertRepository`가 매 요청마다 최신 보안 경고를 조회 (하네스 규칙 3 — 캐시 금지) |
| 보안 경고 요약 | 조회한 알럿 목록을 `ChatPromptTemplate` 컨텍스트로 묶어 요약 생성 |
| 워크플로우 제안 | 동일 체인 출력에 알럿 심각도에 따른 대응 조치 워크플로우를 함께 생성하도록 프롬프트 설계 |
| 쿼리 생성·변환 | 분석가의 자연어 요청을 Elastic 쿼리(DSL/EQL)로 생성·변환하는 것도 같은 체인의 응답 형식 중 하나로 지원 |
| 파인튜닝·커스터마이징 | 실제 파인튜닝 없이 모델 교체 지점(`OLLAMA_MODEL` 등)을 환경 변수로 노출 (하네스 규칙 4) |
| LLM 프로바이더 추상화 | 인터랙터는 `ElasticSecurityAssistantGeneratorPort`만 의존, 구체 LangChain 클래스는 outbound에서만 참조 (하네스 규칙 1) |

### 제안 레이어 구성 (미구현 — 설계 초안)

```text
domain/security_alert.py                                              # 신규: 보안 경고 엔티티
app/dtos/elastic_security_assistant_dto.py
app/ports/input/elastic_security_assistant_use_case.py
app/ports/output/elastic_alert_repository_port.py                     # 실시간 알럿 조회
app/ports/output/elastic_security_assistant_generator_port.py         # LangChain 생성 포트
app/use_cases/elastic_security_assistant_interactor.py                 # 알럿 조회 → 체인 호출 → 요약/워크플로우/쿼리 반환
adapter/outbound/repository/elastic_alert_repository.py
adapter/outbound/client/elastic_security_assistant_generator_client.py # ChatPromptTemplate + ChatOllama
adapter/inbound/api/schemas/elastic_security_assistant_schema.py
adapter/inbound/api/v1/elastic_security_assistant_router.py           # POST /silicon-valley/elastic/assist
dependencies/elastic_security_assistant_provider.py
```

### 체인 흐름

```text
최근 보안 경고(알럿) 조회 (실시간)
        │
        ▼
ChatPromptTemplate(system: 보안 분석 어시스턴트 페르소나 + 알럿 컨텍스트,
                    human: 분석가 요청 — 요약 / 워크플로우 제안 / 쿼리 생성·변환 중 하나)
        │
        ▼
ChatOllama(model=OLLAMA_MODEL)
        │
        ▼
StrOutputParser → 요약·대응 워크플로우·생성된 쿼리 응답
```

### 참고 — 실제 알럿 소스 연동 시 고려 사항

이 설계의 `ElasticAlertRepository`는 알럿을 어디서 조회하는지에 대해 중립적이다. 실제 운영
Elasticsearch 클러스터에서 알럿을 직접 가져오려면 `elasticsearch-py` 클라이언트를 새 의존성으로
추가해야 하며(현재 `requirements.txt`에 없음), 그 전까지는 `document_vector`류 패턴처럼 자체 DB
테이블에 적재된 알럿으로 대체할 수 있다. 어느 쪽이든 포트(`ElasticAlertRepositoryPort`) 뒤에서
교체 가능하므로 인터랙터·프롬프트 로직은 변경되지 않는다.