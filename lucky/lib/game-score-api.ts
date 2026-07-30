const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export type GameScore = {
  game: string;
  best_score: number;
  play_count: number;
};

export type SubmitScoreResult = GameScore & {
  is_record: boolean;
};

function authHeaders(email: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Email": email,
  };
}

// 기록 조회·저장은 어디까지나 부가 기능이다. 실패해도 게임 진행을 막지 않도록
// 예외를 밖으로 던지지 않고 null을 돌려준다.
export async function fetchBestScore(email: string, game: string): Promise<GameScore | null> {
  try {
    const res = await fetch(`${API_BASE}/api/fridge/game-scores/${encodeURIComponent(game)}`, {
      headers: authHeaders(email),
    });
    if (!res.ok) return null;
    return (await res.json()) as GameScore;
  } catch {
    return null;
  }
}

export async function submitScore(
  email: string,
  game: string,
  score: number,
): Promise<SubmitScoreResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/fridge/game-scores/${encodeURIComponent(game)}`, {
      method: "POST",
      headers: authHeaders(email),
      body: JSON.stringify({ score }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SubmitScoreResult;
  } catch {
    return null;
  }
}
