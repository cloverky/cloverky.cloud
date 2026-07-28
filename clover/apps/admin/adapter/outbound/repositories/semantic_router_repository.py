"""star_craft(Hub)의 의도 분류 유스케이스를 admin의 SemanticRouterPort로 감싼다.

스타 토폴로지 규칙: admin(Spoke) → star_craft(Hub)는 허용되지만,
분류 로직 자체는 재구현하지 않고 Hub의 SemanticRouterUseCase를 그대로 재사용한다.
"""

from __future__ import annotations

from admin.app.dtos.semantic_chat_dto import SemanticClassification
from admin.app.ports.output.semantic_router_port import SemanticRouterPort

from star_craft.app.dtos.semantic_route_dto import SemanticRouteCommand
from star_craft.app.ports.input.semantic_router_use_case import SemanticRouterUseCase


class SemanticRouterRepository(SemanticRouterPort):
    def __init__(self, router: SemanticRouterUseCase) -> None:
        self._router = router

    async def classify(self, question: str) -> SemanticClassification:
        result = await self._router.route(SemanticRouteCommand(question=question))
        return SemanticClassification(
            destination=result.destination, entities=result.entities
        )
