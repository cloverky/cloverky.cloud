from __future__ import annotations

from core.matrix.keymaker_api import get_keymaker
from star_craft.app.ports.output.terran_vessel_gemini_gateway import (
    TerranVesselGeminiGatewayPort,
)

_MODEL = "gemini-2.0-flash"


class GeminiTerranVesselGateway(TerranVesselGeminiGatewayPort):
    async def ask(self, question: str) -> str:
        keymaker = get_keymaker()
        if not keymaker.is_gemini_ready():
            raise ValueError(
                "GEMINI_API_KEY가 설정되지 않았습니다. clover/.env 에 키를 넣어 주세요."
            )
        client = keymaker.get_gemini_client()
        response = client.models.generate_content(model=_MODEL, contents=question)
        return (response.text or "").strip()
