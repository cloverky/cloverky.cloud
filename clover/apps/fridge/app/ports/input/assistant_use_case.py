from __future__ import annotations

from abc import ABC, abstractmethod

from fridge.app.dtos.assistant_dto import AssistantChatCommand, AssistantChatResultDto


class AssistantUseCase(ABC):
    @abstractmethod
    async def chat(self, cmd: AssistantChatCommand) -> AssistantChatResultDto:
        """사용자 냉장고 재고를 바탕으로 재고·레시피 질문에 답변"""
        pass
