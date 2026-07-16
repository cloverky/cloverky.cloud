from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from star_craft.app.dtos.terran_vessel_gemini_dto import TerranVesselGeminiCommand
from star_craft.app.ports.input.terran_vessel_gemini_use_case import (
    TerranVesselGeminiUseCase,
)
from star_craft.dependencies.terran_vessel_gemini_provider import (
    get_terran_vessel_gemini_use_case,
)

terran_vessel_gemini_router = APIRouter(prefix="/terran-vessel", tags=["terran-vessel"])


class TerranVesselAskBody(BaseModel):
    question: str


@terran_vessel_gemini_router.post("/ask")
async def ask(
    body: TerranVesselAskBody,
    use_case: TerranVesselGeminiUseCase = Depends(get_terran_vessel_gemini_use_case),
) -> dict[str, str]:
    try:
        result = await use_case.ask(TerranVesselGeminiCommand(question=body.question))
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"answer": result.answer}
