from star_craft.adapter.outbound.ollama.semantic_router_gateway import (
    QwenSemanticRouterGateway,
)
from star_craft.app.ports.input.semantic_router_use_case import SemanticRouterUseCase
from star_craft.app.ports.output.semantic_router_gateway import SemanticRouterLlmPort
from star_craft.app.use_cases.semantic_router_interactor import SemanticRouterInteractor


def get_semantic_router_use_case() -> SemanticRouterUseCase:
    llm: SemanticRouterLlmPort = QwenSemanticRouterGateway()
    return SemanticRouterInteractor(llm=llm)
