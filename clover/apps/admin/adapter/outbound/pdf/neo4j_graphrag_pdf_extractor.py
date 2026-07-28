from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

import fsspec
from admin.app.dtos.pdf_loader_dto import LoadedPdf
from admin.app.ports.output.pdf_extractor_port import PdfExtractorPort
from neo4j_graphrag.exceptions import PdfLoaderError

# 1.18부터 pdf_loader 모듈은 deprecated — data_loader가 정식 경로다.
from neo4j_graphrag.experimental.components.data_loader import PdfLoader
from neo4j_graphrag.experimental.components.types import (
    DocumentInfo,
    DocumentType,
    LoadedDocument,
)


class Neo4jGraphRagPdfExtractor(PdfExtractorPort):
    """neo4j-graphrag PdfLoader(pypdf) 기반 텍스트 추출 어댑터."""

    def __init__(self, filesystem: str = "file") -> None:
        self._loader = PdfLoader()
        self._fs = fsspec.filesystem(filesystem)

    async def extract(self, filename: str, content: bytes) -> LoadedPdf:
        if not content:
            raise ValueError("빈 파일입니다.")

        safe_name = Path(filename).name or "upload.pdf"
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / safe_name
            path.write_bytes(content)
            # pypdf 추출은 동기 I/O — 이벤트 루프를 막지 않도록 스레드로 넘긴다.
            document = await asyncio.to_thread(self._load, path)

        return LoadedPdf(
            uid=document.document_info.uid,
            filename=safe_name,
            text=document.text,
        )

    def _load(self, path: Path) -> LoadedDocument:
        try:
            text = self._loader.load_file(file=str(path), fs=self._fs)
        except PdfLoaderError as exc:
            raise ValueError(f"PDF를 읽을 수 없습니다: {exc}") from exc
        return LoadedDocument(
            text=text,
            document_info=DocumentInfo(
                path=str(path),
                document_type=DocumentType.PDF,
            ),
        )
