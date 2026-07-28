from admin.adapter.outbound.langchain.simple_chat_chain import SimpleChatChain
from admin.adapter.outbound.llm.chat_gateway import (
    ExaoneChatGateway,
    FallbackChatGateway,
    GeminiChatGateway,
    OllamaChatGateway,
)
from admin.app.ports.output.chat_llm_port import ChatLlmPort

from core.lol.t1_mid_faker_orchestrator import get_faker_orchestrator


def get_langchain_chat_chain() -> SimpleChatChain:
    # 로컬은 EXAONE·Ollama, 이들이 없는 배포 환경은 Gemini로 폴백한다.
    chat: ChatLlmPort = FallbackChatGateway(
        ExaoneChatGateway(orchestrator=get_faker_orchestrator()),
        OllamaChatGateway(),
        GeminiChatGateway(),
    )
    return SimpleChatChain(chat=chat)
