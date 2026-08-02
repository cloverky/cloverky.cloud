"""pgvector(PostgreSQL) → Neo4j 이관 스크립트.

PK 를 노드 키 `pg_id` 로, FK 를 관계로 매핑한다.
Postgres 는 읽기만 하고 Neo4j 에는 MERGE 로 기록하므로 몇 번 실행해도 중복되지 않는다.

실행 (드라이버가 설치된 backend 컨테이너에서):
    docker exec cloverkycloud-backend-1 python scripts/pg_to_neo4j.py
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any

import psycopg
from neo4j import GraphDatabase, Session
from psycopg.rows import dict_row


@dataclass(frozen=True)
class NodeSpec:
    """테이블 1개 = 라벨 1개. PK `id` 는 노드의 `pg_id` 가 된다."""

    table: str
    label: str
    skip_columns: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class RelSpec:
    """FK 1개 = 관계 1종."""

    table: str
    fk_column: str
    rel_type: str
    from_label: str
    to_label: str


NODES = (
    # 비밀번호 해시는 그래프로 옮기지 않는다.
    NodeSpec("users", "User", frozenset({"password_hash"})),
    NodeSpec("categories", "Category"),
    NodeSpec("foods", "Food"),
    NodeSpec("inventory", "Inventory"),
    NodeSpec("receipts", "Receipt"),
    NodeSpec("receipt_lines", "ReceiptLine"),
    NodeSpec("contacts", "Contact"),
    # 임베딩 벡터는 pgvector 담당이므로 제외한다.
    NodeSpec("mail_inbox", "Mail", frozenset({"embedding"})),
    NodeSpec("push_subscriptions", "PushSubscription"),
)

RELS = (
    RelSpec("foods", "category_id", "IN_CATEGORY", "Food", "Category"),
    RelSpec("inventory", "user_id", "OWNED_BY", "Inventory", "User"),
    RelSpec("inventory", "food_id", "OF_FOOD", "Inventory", "Food"),
    RelSpec("receipts", "user_id", "OWNED_BY", "Receipt", "User"),
    RelSpec("receipt_lines", "receipt_id", "LINE_OF", "ReceiptLine", "Receipt"),
)


def _pg_dsn() -> str:
    """SQLAlchemy 형식(`postgresql+psycopg_async://`)을 psycopg 가 읽는 DSN 으로 바꾼다."""
    dsn = os.getenv("PG_DSN") or os.environ["DATABASE_URL"]
    return dsn.replace("+psycopg_async", "").replace("+psycopg", "")


def _ensure_constraints(neo: Session) -> None:
    for spec in NODES:
        neo.run(
            f"CREATE CONSTRAINT {spec.label.lower()}_pg_id IF NOT EXISTS "
            f"FOR (n:{spec.label}) REQUIRE n.pg_id IS UNIQUE"
        )


def _copy_nodes(pg: psycopg.Connection[Any], neo: Session, spec: NodeSpec) -> int:
    with pg.cursor(row_factory=dict_row) as cur:
        cur.execute(f"SELECT * FROM {spec.table} ORDER BY id")  # noqa: S608
        rows = [
            {
                "pg_id": row.pop("id"),
                **{k: v for k, v in row.items() if k not in spec.skip_columns},
            }
            for row in cur.fetchall()
        ]
    if rows:
        neo.run(
            f"UNWIND $rows AS row "
            f"MERGE (n:{spec.label} {{pg_id: row.pg_id}}) SET n += row",
            rows=rows,
        )
    return len(rows)


def _copy_rels(pg: psycopg.Connection[Any], neo: Session, spec: RelSpec) -> int:
    with pg.cursor() as cur:
        cur.execute(
            f"SELECT id, {spec.fk_column} FROM {spec.table} "  # noqa: S608
            f"WHERE {spec.fk_column} IS NOT NULL"
        )
        rows = [{"from_id": pk, "to_id": fk} for pk, fk in cur.fetchall()]
    if rows:
        neo.run(
            f"UNWIND $rows AS row "
            f"MATCH (a:{spec.from_label} {{pg_id: row.from_id}}) "
            f"MATCH (b:{spec.to_label} {{pg_id: row.to_id}}) "
            f"MERGE (a)-[:{spec.rel_type}]->(b)",
            rows=rows,
        )
    return len(rows)


def main() -> None:
    driver = GraphDatabase.driver(
        os.getenv("NEO4J_URI", "bolt://neo4j:7687"),
        auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "")),
    )
    with psycopg.connect(_pg_dsn()) as pg, driver, driver.session() as neo:
        _ensure_constraints(neo)
        for node in NODES:
            print(f"{node.table:>18} → :{node.label:<16} {_copy_nodes(pg, neo, node):>4} nodes")
        for rel in RELS:
            source = f"{rel.table}.{rel.fk_column}"
            print(f"{source:>18} → :{rel.rel_type:<16} {_copy_rels(pg, neo, rel):>4} rels")


if __name__ == "__main__":
    main()
