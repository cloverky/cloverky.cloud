from __future__ import annotations

import os
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels

from star_craft.app.dtos.vector_dto import VectorHit
from star_craft.app.ports.output.vector_repository import VectorRepository

# compose 서비스명 qdrant. 필요 시 env로 오버라이드.
_HOST = os.getenv("QDRANT_HOST", "qdrant")
_PORT = int(os.getenv("QDRANT_PORT", "6333"))


class QdrantVectorRepository(VectorRepository):
    def __init__(self, host: str = _HOST, port: int = _PORT) -> None:
        self._host = host
        self._port = port

    async def upsert(
        self, collection: str, id: str, vector: list[float], payload: dict[str, Any]
    ) -> None:
        client = AsyncQdrantClient(host=self._host, port=self._port)
        try:
            if not await client.collection_exists(collection):
                await client.create_collection(
                    collection_name=collection,
                    vectors_config=qmodels.VectorParams(
                        size=len(vector), distance=qmodels.Distance.COSINE
                    ),
                )
            await client.upsert(
                collection_name=collection,
                points=[qmodels.PointStruct(id=id, vector=vector, payload=payload)],
            )
        finally:
            await client.close()

    async def search(
        self, collection: str, vector: list[float], top_k: int
    ) -> list[VectorHit]:
        client = AsyncQdrantClient(host=self._host, port=self._port)
        try:
            hits = await client.search(
                collection_name=collection, query_vector=vector, limit=top_k
            )
        finally:
            await client.close()
        return [
            VectorHit(id=str(hit.id), score=hit.score, payload=hit.payload or {})
            for hit in hits
        ]

    async def delete(self, collection: str, id: str) -> None:
        client = AsyncQdrantClient(host=self._host, port=self._port)
        try:
            await client.delete(
                collection_name=collection,
                points_selector=qmodels.PointIdsList(points=[id]),
            )
        finally:
            await client.close()
