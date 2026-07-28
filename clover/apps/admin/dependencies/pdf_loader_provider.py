from admin.adapter.outbound.llm.chat_gateway import (
    ExaoneChatGateway,
    FallbackChatGateway,
    OllamaChatGateway,
)
from admin.adapter.outbound.llm.pdf_summarizer_gateway import (
    LlmPdfSummarizerGateway,
)
from admin.adapter.outbound.pdf.neo4j_graphrag_pdf_extractor import (
    Neo4jGraphRagPdfExtractor,
)
from admin.adapter.outbound.repositories.pdf_document_repository import (
    PdfDocumentGraphRepository,
)
from admin.app.ports.input.pdf_loader_use_case import PdfLoaderUseCase
from admin.app.ports.output.chat_llm_port import ChatLlmPort
from admin.app.ports.output.pdf_document_port import PdfDocumentPort
from admin.app.ports.output.pdf_extractor_port import PdfExtractorPort
from admin.app.ports.output.pdf_summarizer_port import PdfSummarizerPort
from admin.app.use_cases.pdf_loader_interactor import PdfLoaderInteractor

from core.lol.t1_mid_faker_orchestrator import get_faker_orchestrator
from star_craft.adapter.outbound.graph.neo4j_graph_repository import (
    Neo4jGraphRepository,
)
from star_craft.app.ports.output.graph_repository import GraphRepository


def get_pdf_loader_use_case() -> PdfLoaderUseCase:
    extractor: PdfExtractorPort = Neo4jGraphRagPdfExtractor()
    # EXAONE 우선, 실패 시 Ollama로 폴백
    chat: ChatLlmPort = FallbackChatGateway(
        ExaoneChatGateway(orchestrator=get_faker_orchestrator()),
        OllamaChatGateway(),
    )
    summarizer: PdfSummarizerPort = LlmPdfSummarizerGateway(chat=chat)
    graph: GraphRepository = Neo4jGraphRepository()
    documents: PdfDocumentPort = PdfDocumentGraphRepository(graph=graph)
    return PdfLoaderInteractor(
        extractor=extractor, summarizer=summarizer, documents=documents
    )
