from star_craft.adapter.outbound.gemini.terran_vessel_gemini_gateway import (
    GeminiTerranVesselGateway,
)
from star_craft.app.ports.input.terran_vessel_gemini_use_case import (
    TerranVesselGeminiUseCase,
)
from star_craft.app.ports.output.terran_vessel_gemini_gateway import (
    TerranVesselGeminiGatewayPort,
)
from star_craft.app.use_cases.terran_vessel_gemini_interactor import (
    TerranVesselGeminiInteractor,
)


def get_terran_vessel_gemini_use_case() -> TerranVesselGeminiUseCase:
    gateway: TerranVesselGeminiGatewayPort = GeminiTerranVesselGateway()
    return TerranVesselGeminiInteractor(gateway=gateway)
