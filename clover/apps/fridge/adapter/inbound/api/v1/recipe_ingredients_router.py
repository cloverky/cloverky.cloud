from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from fridge._datasets.recipes_db import RECIPES

"""
레시피 재료 조회 (Recipe Ingredients)
"크림파스타에 뭐가 들어가지?" 는 지어낼 문제가 아니라 찾아볼 문제다.
파인튜닝용으로만 쓰던 큐레이션 레시피 DB 를 조회해 정확한 재료를 돌려준다.
목록에 없는 음식은 404 로 답해 호출한 쪽이 다른 수단을 쓰게 한다.
"""

recipe_ingredients_router = APIRouter(
    prefix="/recipe-ingredients", tags=["recipe-ingredients"]
)


class RecipeIngredientsResponse(BaseModel):
    matched: str = Field(..., description="실제로 찾은 레시피 이름")
    core: list[str] = Field(..., description="반드시 필요한 재료")
    sub: list[str] = Field(..., description="있으면 넣는 재료")
    pantry: list[str] = Field(
        ..., description="기본 양념 — 보통 집에 있어서 장보기 목록에서는 빼도 된다"
    )


def _normalize(text: str) -> str:
    return text.replace(" ", "").strip().lower()


def _find(dish: str) -> dict | None:
    """이름이 정확히 같은 것을 먼저 찾고, 없으면 한쪽이 다른 쪽을 포함하는 것을 찾는다.

    "크림파스타" 로 "우유크림파스타" 를 찾을 수 있어야 하고, 반대로 사용자가
    길게 적어도 찾혀야 한다. 후보가 여럿이면 이름이 짧은 쪽이 더 일반적인
    레시피이므로 그걸 고른다.
    """
    target = _normalize(dish)
    if not target:
        return None

    for recipe in RECIPES:
        if _normalize(recipe["name"]) == target:
            return recipe

    partial = [
        r
        for r in RECIPES
        if target in _normalize(r["name"]) or _normalize(r["name"]) in target
    ]
    if not partial:
        return None
    return min(partial, key=lambda r: len(r["name"]))


@recipe_ingredients_router.get("")
async def get_recipe_ingredients(
    dish: str = Query(..., min_length=1, max_length=50, description="음식 이름"),
) -> RecipeIngredientsResponse:
    recipe = _find(dish)
    if recipe is None:
        raise HTTPException(status_code=404, detail="등록된 레시피가 아닙니다.")

    return RecipeIngredientsResponse(
        matched=recipe["name"],
        core=list(recipe.get("core", [])),
        sub=list(recipe.get("sub", [])),
        pantry=list(recipe.get("pantry", [])),
    )
