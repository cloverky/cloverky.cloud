from __future__ import annotations

import json
from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from pathlib import Path

from star_craft.app.ports.output.jsonl_sink_gateway import JsonlSinkPort


class JsonlFileSinkGateway(JsonlSinkPort):
    """records를 destination 디렉터리에 타임스탬프 jsonl 파일로 적재하는 어댑터."""

    def write(self, destination: str, records: Iterable[Mapping[str, object]]) -> str:
        directory = Path(destination)
        directory.mkdir(parents=True, exist_ok=True)

        ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        path = directory / f"{directory.name}_{ts}.jsonl"

        with path.open("w", encoding="utf-8") as f:
            for record in records:
                f.write(json.dumps(record, ensure_ascii=False) + "\n")

        return str(path)
