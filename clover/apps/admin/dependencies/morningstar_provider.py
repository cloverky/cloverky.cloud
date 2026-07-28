from admin.adapter.outbound.langchain.morningstar_insight_chain import (
    MorningstarInsightChain,
)
from admin.adapter.outbound.llm.chat_gateway import (
    ExaoneChatGateway,
    FallbackChatGateway,
    OllamaChatGateway,
)
from admin.adapter.outbound.market.yahoo_market_data_gateway import (
    YahooMarketDataGateway,
)
from admin.adapter.outbound.repositories.research_document_repository import (
    ResearchDocumentGraphRepository,
)
from admin.app.ports.input.morningstar_use_case import MorningstarUseCase
from admin.app.ports.output.chat_llm_port import ChatLlmPort
from admin.app.ports.output.insight_chain_port import InsightChainPort
from admin.app.ports.output.market_data_port import MarketDataPort
from admin.app.ports.output.research_repository_port import ResearchRepositoryPort
from admin.app.use_cases.langchain_morningstar_interactor import (
    LangchainMorningstarInteractor,
)

from core.lol.t1_mid_faker_orchestrator import get_faker_orchestrator
from star_craft.adapter.outbound.graph.neo4j_graph_repository import (
    Neo4jGraphRepository,
)
from star_craft.app.ports.output.graph_repository import GraphRepository


def get_morningstar_use_case() -> MorningstarUseCase:
    # EXAONE 우선, 실패 시 Ollama로 폴백 — 체인 코드는 그대로 두고 모델만 교체된다.
    chat: ChatLlmPort = FallbackChatGateway(
        ExaoneChatGateway(orchestrator=get_faker_orchestrator()),
        OllamaChatGateway(),
    )
    graph: GraphRepository = Neo4jGraphRepository()
    market: MarketDataPort = YahooMarketDataGateway()
    research: ResearchRepositoryPort = ResearchDocumentGraphRepository(graph=graph)
    chain: InsightChainPort = MorningstarInsightChain(chat=chat)
    return LangchainMorningstarInteractor(market=market, research=research, chain=chain)
