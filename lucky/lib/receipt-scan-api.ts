import { notifySessionExpired, refreshAccessToken } from "@/lib/auth-session";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

export type ScannedItem = {
  name: string;
  quantity: number;
  unit: string;
};

export type ReceiptScanResult = {
  store_name: string | null;
  purchased_date: string | null;
  items: ScannedItem[];
};

export async function scanReceiptByKey(
  email: string,
  s3Bucket: string,
  s3Key: string,
): Promise<ReceiptScanResult> {
  const send = () =>
    fetch(`${API_BASE}/api/fridge/receipt/scan-key`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": email,
      },
      body: JSON.stringify({ s3_bucket: s3Bucket, s3_key: s3Key }),
      signal: AbortSignal.timeout(60_000),
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && (await refreshAccessToken())) {
      res = await send();
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error("영수증 인식 시간이 초과됐습니다. 다시 시도해 주세요.");
    }
    throw new Error("서버에 연결할 수 없습니다.");
  }

  if (res.status === 401) {
    notifySessionExpired();
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  const data = (await res.json()) as ReceiptScanResult & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}
