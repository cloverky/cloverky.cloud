"""LangChain(LCEL) 인사이트 체인 — LangChain import는 이 어댑터 안에서만 일어난다.

prompt(맞춤형 프롬프팅) | RunnableLambda(자체 LLM 게이트웨이) | StrOutputParser
프로바이더 통합 패키지(langchain-openai 등)는 설치되어 있지 않으므로
모델 호출은 ChatLlmPort 구현체가 담당한다. (003-langchain-harness.md §4)
"""

from __future__ import annotations

from admin.app.ports.output.chat_llm_port import ChatLlmPort
from admin.app.ports.output.insight_chain_port import InsightChainPort
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompt_values import PromptValue
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableLambda

_SYSTEM = (
    "너는 Morningstar의 금융 인사이트 엔진이다. "
    "금융 전문가의 복잡한 질문에 근거를 들어 정확히 답한다.\n"
    "투자자 맞춤 지침: {profile_directive}\n"
    "규칙:\n"
    "1) 제공된 [실시간 시세]와 [리서치 발췌]에 있는 사실만 사용한다. "
    "추정이 필요하면 추정임을 명시한다.\n"
    "2) 수치를 인용할 때는 출처(티커 또는 문서명)를 함께 적는다.\n"
    "3) 근거가 부족하면 부족하다고 말한다. 없는 데이터를 지어내지 않는다.\n"
    "4) 한국어로, 아래 형식을 지킨다.\n"
    "   ## 요약 (3불릿)\n   ## 근거\n   ## 리스크\n   ## 다음 확인 사항"
)

_HUMAN = (
    "질문: {question}\n\n"
    "[실시간 시세]\n{market_context}\n\n"
    "[리서치 발췌]\n{research_context}"
)


class MorningstarInsightChain(InsightChainPort):
    def __init__(self, chat: ChatLlmPort) -> None:
        self._chat = chat
        # 체인은 생성자에서 1회만 조립한다 (요청마다 재조립 금지).
        self._chain: Runnable[dict[str, str], str] = (
            ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
            | RunnableLambda(self._call_llm)
            | StrOutputParser()
        )

    async def run(
        self,
        question: str,
        profile_directive: str,
        market_context: str,
        research_context: str,
    ) -> str:
        answer: str = await self._chain.ainvoke(
            {
                "question": question,
                "profile_directive": profile_directive,
                "market_context": market_context,
                "research_context": research_context,
            }
        )
        return answer

    async def _call_llm(self, prompt_value: PromptValue) -> str:
        """렌더링된 프롬프트를 자체 게이트웨이(EXAONE → Ollama)로 넘긴다."""
        system_parts: list[str] = []
        user_parts: list[str] = []
        for message in prompt_value.to_messages():
            target = system_parts if message.type == "system" else user_parts
            target.append(str(message.content))
        return await self._chat.complete("\n".join(system_parts), "\n".join(user_parts))
