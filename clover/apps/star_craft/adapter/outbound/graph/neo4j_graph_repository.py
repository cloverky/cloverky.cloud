from __future__ import annotations

import os
import re
from typing import Any

from neo4j import AsyncGraphDatabase

from star_craft.app.ports.output.graph_repository import GraphRepository

_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
_USER = os.getenv("NEO4J_USER", "neo4j")
_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

# Cypher는 라벨·관계 타입을 파라미터로 바인딩할 수 없어 문자열로 직접 삽입한다.
# 임의 문자열 주입을 막기 위해 식별자 형태만 허용한다.
_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _validate_identifier(value: str) -> str:
    if not _IDENTIFIER.match(value):
        raise ValueError(f"invalid graph identifier: {value!r}")
    return value


class Neo4jGraphRepository(GraphRepository):
    """compose 서비스명 neo4j (Bolt). 필요 시 env로 오버라이드."""

    def __init__(
        self, uri: str = _URI, user: str = _USER, password: str = _PASSWORD
    ) -> None:
        self._uri = uri
        self._auth = (user, password)

    async def upsert_node(self, label: str, props: dict[str, Any]) -> str:
        label = _validate_identifier(label)
        cypher = (
            f"MERGE (n:{label} {{name: $name}}) SET n += $props "
            "RETURN elementId(n) AS id"
        )
        async with AsyncGraphDatabase.driver(self._uri, auth=self._auth) as driver:
            async with driver.session() as session:
                result = await session.run(cypher, name=props.get("name"), props=props)
                record = await result.single(strict=True)
        return str(record["id"])

    async def upsert_relation(self, from_id: str, to_id: str, rel_type: str) -> None:
        rel_type = _validate_identifier(rel_type)
        cypher = (
            "MATCH (a), (b) WHERE elementId(a) = $from_id AND elementId(b) = $to_id "
            f"MERGE (a)-[:{rel_type}]->(b)"
        )
        async with AsyncGraphDatabase.driver(self._uri, auth=self._auth) as driver:
            async with driver.session() as session:
                await session.run(cypher, from_id=from_id, to_id=to_id)

    async def query(self, cypher: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        async with AsyncGraphDatabase.driver(self._uri, auth=self._auth) as driver:
            async with driver.session() as session:
                result = await session.run(cypher, params)
                return [record.data() async for record in result]
