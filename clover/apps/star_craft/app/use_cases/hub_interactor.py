from __future__ import annotations

from star_craft.app.dtos.graph_dto import RelationCommand
from star_craft.app.dtos.vector_dto import RecipeResult, SearchCommand
from star_craft.app.ports.input.hub_use_case import HubUseCase
from star_craft.app.ports.output.graph_repository import GraphRepository
from star_craft.app.ports.output.vector_repository import VectorRepository


class HubInteractor(HubUseCase):
    """스포크 → 허브(Graph DB · Vector DB) 파이프라인 오케스트레이션."""

    def __init__(self, graph: GraphRepository, vector: VectorRepository) -> None:
        self._graph = graph
        self._vector = vector

    async def register_ingredient_relation(self, cmd: RelationCommand) -> None:
        from_id = await self._graph.upsert_node(cmd.from_label, cmd.from_props)
        to_id = await self._graph.upsert_node(cmd.to_label, cmd.to_props)
        await self._graph.upsert_relation(from_id, to_id, cmd.rel_type)

    async def search_recipes(self, cmd: SearchCommand) -> list[RecipeResult]:
        hits = await self._vector.search(cmd.collection, cmd.query_vector, cmd.top_k)
        return [
            RecipeResult(
                id=hit.id,
                name=str(hit.payload.get("name", "")),
                score=hit.score,
                payload=hit.payload,
            )
            for hit in hits
        ]
