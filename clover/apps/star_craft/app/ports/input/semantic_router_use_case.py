from __future__ import annotations

from abc import ABC, abstractmethod

from star_craft.app.dtos.semantic_route_dto import (
    SemanticRouteCommand,
    SemanticRouteResultDto,
)


class SemanticRouterUseCase(ABC):
    @abstractmethod
    async def route(self, cmd: SemanticRouteCommand) -> SemanticRouteResultDto:
        """질문의 의도를 분석해 destination과 entities로 분류"""
        pass
