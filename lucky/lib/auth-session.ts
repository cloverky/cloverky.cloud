/** access_token 세션 수명 관리 — 갱신과 만료 통지를 한곳에서 맡는다. */
const AUTH_BASE = (process.env.NEXT_PUBLIC_AUTH_URL ?? "https://auth.cloverky.cloud").replace(
  /\/$/,
  "",
);

/** 갱신까지 실패했을 때 AuthProvider가 받아 로그아웃 처리하는 이벤트. */
export const SESSION_EXPIRED_EVENT = "cloverky:session-expired";

let inFlight: Promise<boolean> | null = null;

async function requestRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${AUTH_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      // 리프레시 토큰은 httponly 쿠키로 실려간다 — 본문에 담을 것이 없다.
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 액세스 토큰은 10분짜리다 — 만료 시 리프레시 쿠키로 갱신한다.
 *
 * 서버는 리프레시 토큰을 회전시키고 같은 토큰이 두 번 오면 재사용으로 보아
 * 그 사용자의 모든 세션을 폐기한다. 여러 화면이 동시에 401을 만나도 갱신
 * 요청은 반드시 하나만 나가야 하므로, 진행 중인 요청이 있으면 그것을 공유한다.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!inFlight) {
    inFlight = requestRefresh();
    void inFlight.finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

/** 갱신에도 401이면 세션이 끝난 것 — 화면의 로그인 상태를 서버와 맞춘다. */
export function notifySessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
