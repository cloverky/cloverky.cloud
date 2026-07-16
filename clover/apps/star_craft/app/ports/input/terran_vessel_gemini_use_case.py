from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.terran_vessel_gemini_dto import (
    TerranVesselGeminiCommand,
    TerranVesselGeminiResultDto,
)


class TerranVesselGeminiUseCase(ABC):
    @abstractmethod
    async def ask(self, cmd: TerranVesselGeminiCommand) -> TerranVesselGeminiResultDto:
        """사용자 질문을 Gemini로 답변 생성해 반환"""
        pass
