from __future__ import annotations

from star_craft.app.dtos.terran_vessel_gemini_dto import (
    TerranVesselGeminiCommand,
    TerranVesselGeminiResultDto,
)
from star_craft.app.ports.input.terran_vessel_gemini_use_case import (
    TerranVesselGeminiUseCase,
)
from star_craft.app.ports.output.terran_vessel_gemini_gateway import (
    TerranVesselGeminiGatewayPort,
)

_SYSTEM_PROMPT = (
    "당신은 clover의 AI 도우미입니다. "
    "사용자의 질문에 한국어로 정확하고 간결하게 답하세요."
)


class TerranVesselGeminiInteractor(TerranVesselGeminiUseCase):
    def __init__(self, gateway: TerranVesselGeminiGatewayPort) -> None:
        self.gateway = gateway

    async def ask(self, cmd: TerranVesselGeminiCommand) -> TerranVesselGeminiResultDto:
        prompt = f"{_SYSTEM_PROMPT}\n\n[질문]\n{cmd.question}"
        answer = await self.gateway.ask(prompt)
        return TerranVesselGeminiResultDto(answer=answer.strip())
