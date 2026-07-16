from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from star_craft.app.dtos.semantic_route_dto import SemanticRouteCommand
from star_craft.app.ports.input.semantic_router_use_case import SemanticRouterUseCase
from star_craft.dependencies.semantic_router_provider import (
    get_semantic_router_use_case,
)

semantic_router = APIRouter(prefix="/semantic", tags=["semantic-router"])


class SemanticRouteBody(BaseModel):
    question: str


@semantic_router.post("/route")
async def route(
    body: SemanticRouteBody,
    use_case: SemanticRouterUseCase = Depends(get_semantic_router_use_case),
) -> dict[str, object]:
    try:
        result = await use_case.route(SemanticRouteCommand(question=body.question))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"destination": result.destination, "entities": result.entities}
