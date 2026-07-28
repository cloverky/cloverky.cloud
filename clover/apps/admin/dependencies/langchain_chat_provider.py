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
    # EXAONE(vLLM)이 떠 있으면 최우선. 없으면 Gemini로 즉시 응답하고,
    # Ollama(qwen3 thinking, 수십 초~수 분)는 최후 수단으로만 쓴다.
    chat: ChatLlmPort = FallbackChatGateway(
        ExaoneChatGateway(orchestrator=get_faker_orchestrator()),
        GeminiChatGateway(),
        OllamaChatGateway(),
    )
    return SimpleChatChain(chat=chat)
