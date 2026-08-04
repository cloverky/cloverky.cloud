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

export type ReceiptImageItem = {
  key: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string;
  /** presigned GET URL — 발급 후 1시간이 지나면 만료된다. */
  view_url: string;
};

export type ReceiptImageListResponse = {
  items: ReceiptImageItem[];
  total: number;
};

export async function fetchReceiptImages(): Promise<ReceiptImageListResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/receipts/images`, { cache: "no-store" });
  } catch {
    throw new Error("백엔드 서버에 연결할 수 없습니다.");
  }
  const data = (await res.json()) as ReceiptImageListResponse & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
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
