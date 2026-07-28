from __future__ import annotations

import logging

from admin.app.dtos.semantic_chat_dto import (
    SemanticChatQuery,
    SemanticChatResult,
    SemanticClassification,
)
from admin.app.ports.input.semantic_chat_use_case import SemanticChatUseCase
from admin.app.ports.output.chat_chain_port import ChatChainPort
from admin.app.ports.output.semantic_router_port import SemanticRouterPort

logger = logging.getLogger(__name__)

# 분류(star_craft) 호출 자체가 실패했을 때의 안전한 기본값 — 대화는 계속 진행한다.
_UNCLASSIFIED_DESTINATION = "gemini"


class SemanticChatInteractor(SemanticChatUseCase):
    """의도 분류(star_craft Hub) → LangChain 챗봇 엔진 대화 오케스트레이션."""

    def __init__(self, router: SemanticRouterPort, chain: ChatChainPort) -> None:
        self.router = router
        self.chain = chain

    async def chat(self, query: SemanticChatQuery) -> SemanticChatResult:
        if not query.message.strip():
            raise ValueError("메시지가 비어 있습니다.")

        try:
            classification = await self.router.classify(query.message)
        except Exception as exc:  # noqa: BLE001 — 분류 실패는 무분류로 낮추고 대화는 계속한다
            logger.warning("의도 분류 실패 — %s(%s)", type(exc).__name__, exc)
            classification = SemanticClassification(
                destination=_UNCLASSIFIED_DESTINATION, entities=[]
            )

        reply = await self.chain.run(
            query.message, classification.destination, classification.entities
        )
        return SemanticChatResult(
            reply=reply,
            destination=classification.destination,
            entities=classification.entities,
        )
