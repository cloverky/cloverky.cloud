# 003 — LangChain 하네스

> 목적: LangChain이 **무엇을 해주는 도구인지**와 **이 저장소에서 어디까지 허용되는지**를 한 문서로 고정한다.
> 코딩 에이전트는 LangChain 코드를 쓰기 전 이 문서를 먼저 읽는다.

---

## 0. 한 줄 정의

LangChain은 **LLM을 애플리케이션 부품으로 조립하기 위한 프레임워크**다.
"모델에 물어본다"가 아니라 **데이터 소스 → 프롬프트 → 모델 → 파서 → 후속 동작**을 하나의 파이프라인(체인)으로 묶는다.

---

## 1. 주요 기능

### 1.1 다양한 데이터 소스와의 통합

데이터베이스·API·파일 시스템의 데이터를 **실시간으로** 끌어와 LLM 입력에 합칠 수 있다.
이 통합이 응답의 정확성과 관련성을 좌우한다.

- 금융: 실시간 시장 데이터를 분석에 결합
- 의료: 환자 기록을 즉시 조회해 근거로 사용
- 이 저장소: PDF 추출(`neo4j-graphrag`), Neo4j 그래프, Qdrant 벡터, 외부 시세 API

### 1.2 유연한 프롬프팅 및 컨텍스트 관리

프롬프트를 **템플릿·변수·메시지 역할(system/human/ai)** 로 다루고, 대화의 컨텍스트를 일관되게 유지한다.
같은 질문이라도 사용자 속성에 따라 다른 지시문을 주입하는 **맞춤형 프롬프팅**이 가능하다.

- 챗봇·학습 도우미처럼 연속성이 필요한 흐름에서 특히 유효
- 이 저장소: [[005-langcjain-morningstar-strategy]]의 투자자 프로필별 지시문 주입

### 1.3 파인튜닝 및 커스터마이징

특정 업무·산업 용어에 맞게 모델을 조정하고, **모델을 갈아끼우기 쉽게** 만든다.
체인 구조는 그대로 두고 모델만 교체하는 것이 핵심 이점이다.

- 이 저장소: EXAONE(vLLM) ↔ Ollama(Qwen) 교체·폴백이 이 성질을 그대로 사용한다

### 1.4 데이터 반응형(data-reactive) 애플리케이션

입력과 실시간 데이터 변화에 **즉시 반응**하는 시스템을 만든다.

- 시장 변화에 따라 전략을 조정하는 금융 앱
- 입력에 따라 실시간으로 콘텐츠를 바꾸는 교육 플랫폼

---

## 2. 장점

| 장점 | 내용 | 이 저장소에서의 의미 |
|------|------|---------------------|
| **다양한 LLM 통합** | GPT-4, Hugging Face 등 여러 모델을 같은 인터페이스로 연결·확장 | 로컬 EXAONE/Ollama를 같은 체인에 꽂아 쓴다 |
| **높은 커스터마이징** | 프롬프팅·컨텍스트·파인튜닝을 세밀하게 조정 | 프로필별 지시문, 도메인 용어 강제 |
| **오픈소스 커뮤니티** | 활발한 업데이트와 레퍼런스 | 버전 이동이 잦다는 뜻이기도 하다 → §4 참고 |

## 3. 단점 (반드시 인지)

| 단점 | 내용 | 대응 |
|------|------|------|
| **성능 최적화 필요** | 외부 소스가 늘수록 연산·지연이 누적된다. 실시간 응답 요구와 충돌 | 소스 호출은 `asyncio.gather`로 병렬화, 청크 수·top_k를 상한으로 고정 |
| **러닝 커브** | 기능·옵션이 많아 초심자에게 복잡 | 이 저장소는 **LCEL 최소 조합**만 사용 (§5) |
| **모든 유즈케이스에 맞지는 않음** | 고도로 특화된 요구는 직접 구현이 더 낫고, 비용·복잡도 면에서 다른 선택이 나을 수 있다 | 단순 1회 호출은 LangChain 없이 게이트웨이 직접 호출 |

---

## 4. 이 저장소의 설치 상태 (확인 필수)

```text
langchain        1.3.11
langchain-core   1.5.1
langgraph        1.2.6      # → [[004-langgraph-harness]]
langsmith        0.9.3
```

**프로바이더 통합 패키지(`langchain-openai`, `langchain-ollama` 등)는 설치되어 있지 않다.**

- 따라서 `ChatOpenAI`, `ChatOllama` 같은 클래스는 **import할 수 없다.**
- 모델 호출은 이 저장소의 **아웃바운드 게이트웨이(httpx)** 를 `RunnableLambda`로 감싸 체인에 넣는다.
- 프로바이더 패키지가 필요하면 `requirements.txt` + `requirements-docker.txt`에 추가하고 이미지를 재빌드해야 한다 (임의 추가 금지, 사용자 승인 필요).

---

## 5. 허용되는 사용 범위 (LCEL 최소 조합)

```python
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda

prompt = ChatPromptTemplate.from_messages([("system", SYSTEM), ("human", HUMAN)])
chain = prompt | RunnableLambda(call_llm) | StrOutputParser()
answer = await chain.ainvoke({"question": ..., "context": ...})
```

| 구성 요소 | 역할 | 허용 |
|-----------|------|------|
| `ChatPromptTemplate` | 역할별 메시지 + 변수 바인딩 | ✅ |
| `RunnableLambda` | 자체 LLM 게이트웨이를 체인에 삽입 (async 함수 가능) | ✅ |
| `StrOutputParser` / `JsonOutputParser` | 출력 정규화 | ✅ |
| `Runnable` 파이프(`|`) 조합 | 체인 구성 | ✅ |
| 프로바이더 `Chat*` 클래스 | 미설치 | ❌ |
| LangChain 내장 벡터스토어·리트리버 | Neo4j/Qdrant는 이미 자체 포트가 있다 | ❌ (중복) |

---

## 6. 아키텍처 규칙 (헥사고날과의 관계)

```
adapter/outbound/langchain/*_chain.py   ← LangChain import는 여기서만
        ↑ 구현
app/ports/output/*_chain_port.py        ← 순수 ABC (LangChain 타입 노출 금지)
        ↑ 의존
app/use_cases/*_interactor.py           ← 프레임워크를 모른다
```

| 규칙 | 이유 |
|------|------|
| `langchain_core` import는 **어댑터에서만** | 프레임워크 교체 시 코어가 흔들리지 않게 (Clean Architecture 의존 방향) |
| 포트 시그니처는 **str·DTO만** 주고받는다 | `Runnable`, `BaseMessage`가 유스케이스로 새면 안 된다 |
| Interactor에서 `chain.ainvoke` 직접 호출 금지 | 어댑터가 체인을 소유한다 |
| 프롬프트 문자열은 어댑터 상수 또는 `app/use_cases/_*.py` 순수 함수 | 라우터·리포지토리에 흩뿌리지 않는다 |
| 체인은 **생성자에서 1회 조립**, 요청마다 재조립 금지 | §3 성능 |

---

## 7. 검증 (하네스)

```bash
# 정적 검사
cd clover && ruff check . --fix && ruff format . && mypy . --config-file pyproject.toml

# 체인 조립 스모크 — LLM 없이 구조만 확인
cd clover && python -c "import main"
```

| 작업 | 성공 기준 |
|------|----------|
| 체인 추가 | 스텁 LLM 포트를 주입해 `ainvoke`가 문자열을 반환 |
| 프롬프트 변경 | 변수 누락 시 `KeyError`가 아니라 템플릿 검증에서 즉시 실패 |
| 모델 교체 | 체인 코드 수정 없이 `dependencies/`에서 게이트웨이만 교체 |
| 외부 소스 추가 | 호출이 병렬화되어 전체 지연이 최댓값 수준 (합계가 아님) |

---

## 8. 안티패턴

| 안티패턴 | 올바른 방향 |
|----------|------------|
| Interactor·라우터에서 `from langchain_core...` | 어댑터에만 둔다 |
| 요청마다 `ChatPromptTemplate` 재생성 | 생성자에서 1회 조립 |
| 설치되지 않은 `langchain_openai` import | 자체 게이트웨이 + `RunnableLambda` |
| 프롬프트에 원문 전체를 그대로 투입 | 청크 상한·top_k로 컨텍스트 통제 |
| 체인 실패를 그대로 500으로 노출 | 게이트웨이 폴백 → 실패 시 502로 변환 |
| 단순 1회 호출에 체인 도입 | 게이트웨이 직접 호출 (§3 러닝 커브·복잡도) |
