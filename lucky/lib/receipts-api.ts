const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

export type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
};

/** 영수증에서 읽어낸 내용. 아직 스캔하지 않았으면 항목 자체가 null 이다. */
export type ReceiptParse = {
  store_name: string | null;
  purchased_date: string | null;
  items: ParsedItem[];
  parsed_at: string | null;
};

export type ReceiptImageItem = {
  key: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string;
  /** presigned GET URL — 발급 후 1시간이 지나면 만료된다. */
  view_url: string;
  parsed: ReceiptParse | null;
};

export type ReceiptImageListResponse = {
  items: ReceiptImageItem[];
  total: number;
};

async function request(
  path: string,
  headers?: HeadersInit,
): Promise<ReceiptImageListResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", headers });
  } catch {
    throw new Error("백엔드 서버에 연결할 수 없습니다.");
  }
  const data = (await res.json()) as ReceiptImageListResponse & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}

/** S3에 적재된 전체 영수증 (lesson 실습 화면용). */
export function fetchReceiptImages(): Promise<ReceiptImageListResponse> {
  return request("/api/receipts/images");
}

/** 해당 회원이 올린 영수증만 조회한다. */
export function fetchMyReceiptImages(
  email: string,
): Promise<ReceiptImageListResponse> {
  return request("/api/receipts/images/mine", { "X-User-Email": email });
}

async function mutate(
  path: string,
  init: RequestInit & { headers: HeadersInit },
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new Error("백엔드 서버에 연결할 수 없습니다.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as FastApiErrorBody;
    throw new Error(parseApiError(data, res.status));
  }
}

/** 영수증을 S3와 업로드 기록에서 함께 지운다. 남의 영수증은 서버가 404로 막는다. */
export function deleteReceiptImage(email: string, key: string): Promise<void> {
  return mutate(`/api/receipts/images?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
    headers: { "X-User-Email": email },
  });
}

export type SaveReceiptParsePayload = {
  s3_key: string;
  store_name: string | null;
  purchased_date: string | null;
  items: ParsedItem[];
};

/** 스캔 성공 직후 인식 결과를 영수증에 붙여 목록에서 사진과 함께 보이게 한다. */
export function saveReceiptParseResult(
  email: string,
  payload: SaveReceiptParsePayload,
): Promise<void> {
  return mutate("/api/receipts/images/parsed", {
    method: "POST",
    headers: {
      "X-User-Email": email,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatUploadedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
