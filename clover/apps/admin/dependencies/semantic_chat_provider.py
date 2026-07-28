from admin.adapter.outbound.langchain.semantic_chat_chain import SemanticChatChain
from admin.adapter.outbound.llm.chat_gateway import (
    ExaoneChatGateway,
    FallbackChatGateway,
    GeminiChatGateway,
    OllamaChatGateway,
)
from admin.adapter.outbound.repositories.semantic_router_repository import (
    SemanticRouterRepository,
)
from admin.app.ports.input.semantic_chat_use_case import SemanticChatUseCase
from admin.app.ports.output.chat_chain_port import ChatChainPort
from admin.app.ports.output.chat_llm_port import ChatLlmPort
from admin.app.ports.output.semantic_router_port import SemanticRouterPort
from admin.app.use_cases.semantic_chat_interactor import SemanticChatInteractor

from core.lol.t1_mid_faker_orchestrator import get_faker_orchestrator
from star_craft.adapter.outbound.ollama.semantic_router_gateway import (
    QwenSemanticRouterGateway,
)
from star_craft.app.ports.input.semantic_router_use_case import SemanticRouterUseCase
from star_craft.app.ports.output.semantic_router_gateway import SemanticRouterLlmPort
from star_craft.app.use_cases.semantic_router_interactor import SemanticRouterInteractor


def get_semantic_chat_use_case() -> SemanticChatUseCase:
    # star_craft(Hub)의 분류 로직을 그대로 재사용 — 재구현하지 않는다.
    hub_llm: SemanticRouterLlmPort = QwenSemanticRouterGateway()
    hub_router: SemanticRouterUseCase = SemanticRouterInteractor(llm=hub_llm)
    router: SemanticRouterPort = SemanticRouterRepository(router=hub_router)

    # 랭체인 어시스턴트와 동일한 게이트웨이 순서를 공유한다 —
    # EXAONE 우선, 없으면 Gemini로 즉시 응답, Ollama는 최후 수단.
    chat: ChatLlmPort = FallbackChatGateway(
        ExaoneChatGateway(orchestrator=get_faker_orchestrator()),
        GeminiChatGateway(),
        OllamaChatGateway(),
    )
    chain: ChatChainPort = SemanticChatChain(chat=chat)

    return SemanticChatInteractor(router=router, chain=chain)
