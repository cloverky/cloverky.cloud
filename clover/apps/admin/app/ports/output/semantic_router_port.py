from __future__ import annotations

from abc import ABC, abstractmethod

from admin.app.dtos.semantic_chat_dto import SemanticClassification


class SemanticRouterPort(ABC):
    @abstractmethod
    async def classify(self, question: str) -> SemanticClassification:
        """질문의 의도를 분류한다. 분류 자체의 실패(파싱 등)는 안전한 기본값으로 처리된 결과를 반환한다."""
        pass
