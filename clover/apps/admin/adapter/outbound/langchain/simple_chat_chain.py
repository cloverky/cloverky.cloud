"""LangChain(LCEL) 범용 채팅 체인 — 간단한 대화형 어시스턴트."""

from __future__ import annotations

from admin.app.ports.output.chat_llm_port import ChatLlmPort
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompt_values import PromptValue
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnableLambda

_SYSTEM = (
    "너는 친절하고 유능한 AI 어시스턴트다. "
    "사용자의 질문에 정확하고 도움이 되는 답변을 한다. "
    "한국어로 답변한다."
)

_HUMAN = "{message}"


class SimpleChatChain:
    """LangChain LCEL 기반 범용 채팅 체인."""

    def __init__(self, chat: ChatLlmPort) -> None:
        self._chat = chat
        self._chain: Runnable[dict[str, str], str] = (
            ChatPromptTemplate.from_messages([("system", _SYSTEM), ("human", _HUMAN)])
            | RunnableLambda(self._call_llm)
            | StrOutputParser()
        )

    async def run(self, message: str) -> str:
        return await self._chain.ainvoke({"message": message})

    async def _call_llm(self, prompt_value: PromptValue) -> str:
        system_parts: list[str] = []
        user_parts: list[str] = []
        for msg in prompt_value.to_messages():
            target = system_parts if msg.type == "system" else user_parts
            target.append(str(msg.content))
        return await self._chat.complete("\n".join(system_parts), "\n".join(user_parts))
