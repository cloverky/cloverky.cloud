from dataclasses import dataclass, field


@dataclass(frozen=True)
class SemanticChatQuery:
    message: str


@dataclass(frozen=True)
class SemanticClassification:
    """star_craft(Hub)의 의도 분류 결과 — destination: crud | exaone_rag | gemini."""

    destination: str
    entities: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class SemanticChatResult:
    reply: str
    destination: str
    entities: list[str]
