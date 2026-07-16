from __future__ import annotations

import json
import re

from star_craft.app.dtos.semantic_route_dto import (
    SemanticRouteCommand,
    SemanticRouteResultDto,
)
from star_craft.app.ports.input.semantic_router_use_case import SemanticRouterUseCase
from star_craft.app.ports.output.semantic_router_gateway import SemanticRouterLlmPort

_VALID_DESTINATIONS = {"crud", "exaone_rag", "gemini"}
# 파싱/분류 실패 시 안전하게 우회하는 기본 목적지 (환각 방지: 근거 기반 RAG로)
_FALLBACK_DESTINATION = "exaone_rag"

_ROUTING_PROMPT = """너는 입력된 질문의 의도를 파악하는 분류 비서야.
아래 지정된 JSON 형식으로만 응답하고, 다른 설명이나 텍스트는 절대 붙이지 마.

출력 JSON 스키마:
{"destination": "crud" | "exaone_rag" | "gemini", "entities": ["질문 속 핵심 단어나 고유명사"]}

[분류 기준]
- 데이터 생성/수정/삭제를 명확히 요구할 때: "crud"
- 스타 토폴로지 노드 관계·사내 전문 도메인 지식 질문: "exaone_rag"
- 일상 대화·인사·일반 상식 등 사내 정보가 필요 없는 질문: "gemini"

[예시]
질문: "회사 인프라 서버 사양이 어떻게 돼?"
답변: {"destination": "exaone_rag", "entities": ["인프라 서버", "사양"]}"""


def _extract_json(text: str) -> dict[str, object]:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("JSON 블록을 찾을 수 없습니다.")
    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("JSON 객체가 아닙니다.")
    return parsed


def _normalize_entities(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


class SemanticRouterInteractor(SemanticRouterUseCase):
    def __init__(self, llm: SemanticRouterLlmPort) -> None:
        self.llm = llm

    async def route(self, cmd: SemanticRouteCommand) -> SemanticRouteResultDto:
        raw = await self.llm.generate(_ROUTING_PROMPT, cmd.question)
        try:
            decision = _extract_json(raw)
            destination = str(decision.get("destination", "")).strip()
            entities = _normalize_entities(decision.get("entities"))
        except (json.JSONDecodeError, ValueError):
            # 가드레일: 파싱 실패 시 기본 RAG로 우회
            destination, entities = _FALLBACK_DESTINATION, []

        if destination not in _VALID_DESTINATIONS:
            destination = _FALLBACK_DESTINATION

        return SemanticRouteResultDto(destination=destination, entities=entities)
