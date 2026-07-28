"""LangChain(LCEL) 챗봇 엔진 — 의도 분류 결과를 반영해 답한다.

prompt(분류 결과 주입) | RunnableLambda(자체 LLM 게이트웨이) | StrOutputParser
LangChain import는 이 어댑터 안에서만 일어난다 (003-langchain-harness.md §6).
"""

from __future__ import annotations

from admin.app.ports.output.chat_chain_port import ChatChainPort
from admin.app.ports.output.chat_llm_port import ChatLlmPort
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompt_values import PromptValue
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableLambda

_SYSTEM = (
    "너는 친절하고 유능한 AI 어시스턴트다. 사용자의 질문에 정확하고 도움이 되는 답변을 한다.\n\n"
    "별도의 의도 분류기가 이 질문을 미리 분석했다 (참고용 — 분류 결과를 사용자에게 그대로 "
    "나열하지 말고 답변 방식에만 반영한다):\n"
    "- 분류된 의도: {destination}\n"
    "- 인식된 핵심 단어: {entities}\n\n"
    "분류가 crud이면: 이 채팅으로는 데이터 생성·수정·삭제를 직접 수행할 수 없음을 안내하고, "
    "필요한 작업은 해당 기능·화면을 이용하도록 안내한다.\n"
    "분류가 exaone_rag이면: 사내 도메인 지식이 필요한 질문이다. 확실하지 않은 사실은 추정임을 "
    "밝히고, 인식된 핵심 단어에 답변의 초점을 맞춘다. 실제 문서를 조회한 것처럼 말하지 않는다.\n"
    "분류가 gemini이면: 일반적인 대화로 보고 자유롭게 답한다.\n\n"
    "한국어로 답변한다."
)
_HUMAN = "{message}"


class SemanticChatChain(ChatChainPort):
    def __init__(self, chat: ChatLlmPort) -> None:
        self._chat = chat
        # 체인은 생성자에서 1회만 조립한다 (요청마다 재조립 금지).
        self._chain: Runnable[dict[str, str], str] = (
            ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
            | RunnableLambda(self._call_llm)
            | StrOutputParser()
        )

    async def run(self, message: str, destination: str, entities: list[str]) -> str:
        answer: str = await self._chain.ainvoke(
            {
                "message": message,
                "destination": destination,
                "entities": ", ".join(entities) if entities else "(없음)",
            }
        )
        return answer

    async def _call_llm(self, prompt_value: PromptValue) -> str:
        system_parts: list[str] = []
        user_parts: list[str] = []
        for msg in prompt_value.to_messages():
            target = system_parts if msg.type == "system" else user_parts
            target.append(str(msg.content))
        return await self._chat.complete("\n".join(system_parts), "\n".join(user_parts))
