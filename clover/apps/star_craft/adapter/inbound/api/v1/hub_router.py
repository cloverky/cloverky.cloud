from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from star_craft.app.dtos.graph_dto import RelationCommand
from star_craft.app.dtos.vector_dto import SearchCommand
from star_craft.app.ports.input.hub_use_case import HubUseCase
from star_craft.dependencies.hub import get_hub_use_case

hub_router = APIRouter(prefix="/hub", tags=["hub"])


class RegisterRelationBody(BaseModel):
    from_label: str
    from_props: dict[str, Any]
    to_label: str
    to_props: dict[str, Any]
    rel_type: str


class SearchRecipesBody(BaseModel):
    collection: str
    query_vector: list[float]
    top_k: int = 5


@hub_router.post("/relations")
async def register_relation(
    body: RegisterRelationBody,
    use_case: HubUseCase = Depends(get_hub_use_case),
) -> dict[str, object]:
    try:
        await use_case.register_ingredient_relation(
            RelationCommand(
                from_label=body.from_label,
                from_props=body.from_props,
                to_label=body.to_label,
                to_props=body.to_props,
                rel_type=body.rel_type,
            )
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {"ok": True}


@hub_router.post("/recipes/search")
async def search_recipes(
    body: SearchRecipesBody,
    use_case: HubUseCase = Depends(get_hub_use_case),
) -> dict[str, object]:
    try:
        results = await use_case.search_recipes(
            SearchCommand(
                collection=body.collection,
                query_vector=body.query_vector,
                top_k=body.top_k,
            )
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "results": [
            {"id": r.id, "name": r.name, "score": r.score, "payload": r.payload}
            for r in results
        ]
    }
