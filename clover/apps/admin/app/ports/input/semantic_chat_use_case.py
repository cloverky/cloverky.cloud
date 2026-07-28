from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.semantic_chat_dto import SemanticChatQuery, SemanticChatResult


class SemanticChatUseCase(ABC):
    @abstractmethod
    async def chat(self, query: SemanticChatQuery) -> SemanticChatResult:
        """의도를 분류한 뒤, 그 분류를 반영해 LangChain 챗봇 엔진이 답한다."""
        pass
