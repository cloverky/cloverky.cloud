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

export type Verdict = "up" | "down";

export type RecipeFeedback = {
  liked: string[];
  /** 싫어요를 준 레시피 — 추천 목록에서 빠진다. */
  disliked: string[];
};

async function call<T>(path: string, init: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: "no-store", ...init });
  } catch {
    throw new Error("백엔드 서버에 연결할 수 없습니다.");
  }
  const data = (await res.json().catch(() => ({}))) as T & FastApiErrorBody;
  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }
  return data;
}

export function fetchRecipeFeedback(email: string): Promise<RecipeFeedback> {
  return call<RecipeFeedback>("/api/fridge/recipe-feedback", {
    headers: { "X-User-Email": email },
  });
}

/** 같은 평가를 다시 보내면 취소된다. 적용 후 상태를 돌려준다. */
export function putRecipeFeedback(
  email: string,
  recipeName: string,
  verdict: Verdict,
): Promise<{ verdict: Verdict | "none" }> {
  return call<{ verdict: Verdict | "none" }>("/api/fridge/recipe-feedback", {
    method: "PUT",
    headers: {
      "X-User-Email": email,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipe_name: recipeName, verdict }),
  });
}

export function clearRecipeFeedback(
  email: string,
  recipeName: string,
): Promise<{ cleared: boolean }> {
  return call<{ cleared: boolean }>(
    `/api/fridge/recipe-feedback?recipe_name=${encodeURIComponent(recipeName)}`,
    {
      method: "DELETE",
      headers: { "X-User-Email": email },
    },
  );
}
