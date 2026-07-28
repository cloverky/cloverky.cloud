from dataclasses import dataclass


@dataclass(frozen=True)
class PdfUploadCommand:
    """업로드된 PDF 원본 — 인바운드에서 유스케이스로 들어오는 입력."""

    filename: str
    content: bytes


@dataclass(frozen=True)
class LoadedPdf:
    """PdfLoader가 추출한 텍스트와 문서 식별자."""

    uid: str
    filename: str
    text: str


@dataclass(frozen=True)
class PdfDocumentRecord:
    """그래프에 적재할 문서 1건."""

    uid: str
    filename: str
    summary: str
    char_count: int


@dataclass(frozen=True)
class PdfSummaryResult:
    """유스케이스 실행 결과."""

    uid: str
    filename: str
    summary: str
    char_count: int
    node_id: str
    preview: str
