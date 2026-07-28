from star_craft.adapter.outbound.graph.neo4j_graph_repository import (
    Neo4jGraphRepository,
)
from star_craft.adapter.outbound.vector.qdrant_vector_repository import (
    QdrantVectorRepository,
)
from star_craft.app.ports.input.hub_use_case import HubUseCase
from star_craft.app.ports.output.graph_repository import GraphRepository
from star_craft.app.ports.output.vector_repository import VectorRepository
from star_craft.app.use_cases.hub_interactor import HubInteractor


def get_hub_use_case() -> HubUseCase:
    graph: GraphRepository = Neo4jGraphRepository()
    vector: VectorRepository = QdrantVectorRepository()
    return HubInteractor(graph=graph, vector=vector)
