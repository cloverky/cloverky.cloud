import { connectionErrorMessage } from "@/lib/api-errors";
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

function authHeaders(email: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Email": email,
  };
}

export type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  quantity_label: string;
  expiry_date: string | null;
  purchased_date: string | null;
  expiry_is_estimated: boolean;
  shelf_life_days: number | null;
  storage: string;
  min_quantity: number;
  status: string;
};

export type InventoryStats = {
  total: number;
  expiring_soon: number;
  low_stock: number;
};

export type InventoryListResponse = {
  items: InventoryItem[];
  stats: InventoryStats;
};

export type InventoryItemPayload = {
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: string | null;
  purchased_date?: string | null;
  storage: string;
  min_quantity?: number;
};

export type ExpiryEstimate = {
  name: string;
  purchased_date: string;
  storage: string;
  shelf_life_days: number;
  estimated_expiry_date: string;
  message: string;
};

export async function fetchExpiryEstimate(
  name: string,
  purchasedDate: string,
  storage: string,
): Promise<ExpiryEstimate> {
  const params = new URLSearchParams({
    name: name.trim(),
    purchasedDate,
    storage,
  });
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/fridge/inventory/estimate-expiry?${params}`);
  } catch {
    throw new Error(connectionErrorMessage());
  }
  const data = (await res.json()) as ExpiryEstimate & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}

async function request<T>(
  email: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const send = () =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      // access_token 쿠키(.cloverky.cloud)를 함께 보낸다.
      credentials: "include",
      headers: {
        ...authHeaders(email),
        ...init?.headers,
      },
    });

  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && (await refreshAccessToken())) {
      res = await send();
    }
  } catch {
    throw new Error(connectionErrorMessage());
  }

  if (res.status === 401) {
    // 갱신해도 통과 못 하면 세션은 끝난 것이다. 화면은 sessionStorage만 보고
    // 계속 로그인 상태로 남으므로, 여기서 알려 주지 않으면 401만 반복된다.
    notifySessionExpired();
    throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = (await res.json()) as T & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}

export function fetchInventory(email: string): Promise<InventoryListResponse> {
  return request<InventoryListResponse>(email, "/api/fridge/inventory");
}

export function createInventoryItem(
  email: string,
  payload: InventoryItemPayload,
): Promise<InventoryItem> {
  return request<InventoryItem>(email, "/api/fridge/inventory", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteInventoryItem(email: string, id: number): Promise<void> {
  return request<void>(email, `/api/fridge/inventory/${id}`, { method: "DELETE" });
}

export type InventoryAdjustResponse = {
  item: InventoryItem | null;
  removed: boolean;
  message: string;
};

export function consumeInventoryItem(
  email: string,
  id: number,
  amount = 1,
): Promise<InventoryAdjustResponse> {
  return request<InventoryAdjustResponse>(email, `/api/fridge/inventory/${id}/consume`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

export function addInventoryQuantity(
  email: string,
  id: number,
  amount = 1,
): Promise<InventoryAdjustResponse> {
  return request<InventoryAdjustResponse>(email, `/api/fridge/inventory/${id}/add`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

const MEAT_GEUN_KEYWORDS = [
  "돼지",
  "삼겹",
  "목살",
  "갈비",
  "등심",
  "안심",
  "불고기",
  "소고기",
  "한우",
  "쇠고기",
  "양지",
  "사태",
  "우삼겹",
  "제육",
  "수육",
] as const;

/** 라면·면류 — 낱개(개) vs 한 봉지(봉) 선택 */
export const PACK_COUNT_KEYWORDS = [
  "라면",
  "컵라면",
  "짜파게티",
  "짜파",
  "너구리",
  "삼양",
  "진라면",
  "안성탕면",
  "우동",
  "라볶이",
  "파스타",
  "스파게티",
  "소면",
  "당면",
  "칼국수",
  "쫄면",
  "비빔면",
  "볶음면",
] as const;

export type PackCountStyle = "piece" | "bag";

export function isPackCountFood(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  return PACK_COUNT_KEYWORDS.some((k) => n.includes(k));
}

export function unitForPackStyle(style: PackCountStyle): "개" | "봉" {
  return style === "piece" ? "개" : "봉";
}

export function packStyleFromUnit(unit: string): PackCountStyle | null {
  if (unit === "개") return "piece";
  if (unit === "봉") return "bag";
  return null;
}

/** 돼지·소고기 등은 근 단위가 자연스럽습니다. */
export function suggestUnitForName(name: string): string | null {
  const n = name.trim().toLowerCase();
  if (MEAT_GEUN_KEYWORDS.some((k) => n.includes(k))) {
    return "근";
  }
  return null;
}

/** － / ＋ 버튼으로 줄이거나 늘리는 개수 (항상 1) */
export function quantityStep(_unit: string): number {
  return 1;
}

export const INVENTORY_UNITS = ["개", "근", "팩", "통", "봉", "g", "ml"] as const;
export const INVENTORY_STORAGE = ["냉장", "냉동", "실온"] as const;

export type ReceiptImageUploadResult = {
  id: number;
  s3_bucket: string;
  s3_key: string;
  s3_url: string;
  status: string;
};

export async function uploadReceiptImage(
  email: string,
  imageFile: File,
  /** 영수증에 붙일 이름. 비우면 서버가 파일명을 쓴다. */
  displayName?: string,
): Promise<ReceiptImageUploadResult> {
  const form = new FormData();
  form.append("file", imageFile);
  if (displayName?.trim()) {
    form.append("display_name", displayName.trim());
  }
  const res = await fetch(`${API_BASE}/api/receipts/images`, {
    method: "POST",
    credentials: "include",
    headers: { "X-User-Email": email },
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as FastApiErrorBody;
    throw new Error(parseApiError(data, res.status));
  }
  return res.json() as Promise<ReceiptImageUploadResult>;
}
