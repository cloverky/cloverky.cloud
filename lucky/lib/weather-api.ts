/** FastAPI 백엔드 GET /weather */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const CACHE_KEY = "cloverky-weather-v1";

export type WeatherData = {
  city: string;
  country: string;
  temp_c: number;
  feels_like_c: number;
  description: string;
  icon: string;
  humidity: number;
};

type FastApiErrorBody = { detail?: string | { msg?: string }[] };

function parseApiError(data: FastApiErrorBody, status: number): string {
  const { detail } = data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg ?? JSON.stringify(d)).join("\n");
  }
  return `요청 실패 (${status})`;
}

export function readCachedWeather(): WeatherData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherData;
  } catch {
    return null;
  }
}

export function writeCachedWeather(data: WeatherData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export type WeatherLocation =
  | { kind: "coords"; lat: number; lon: number }
  | { kind: "city"; city: string; country: string };

export async function fetchWeather(location: WeatherLocation): Promise<WeatherData> {
  const params =
    location.kind === "coords"
      ? new URLSearchParams({ lat: String(location.lat), lon: String(location.lon) })
      : new URLSearchParams({ city: location.city, country: location.country });
  const res = await fetch(`${API_BASE}/weather?${params}`, { cache: "no-store" });
  const data = (await res.json()) as WeatherData & FastApiErrorBody;

  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }

  writeCachedWeather(data);
  return data;
}

const COORDS_KEY = "cloverky-weather-coords-v1";

/** 한 번 허용한 위치는 기억해 둔다 — 다음 방문에는 탭하지 않아도 그 위치로 조회한다. */
export function readCachedCoords(): { lat: number; lon: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    return raw ? (JSON.parse(raw) as { lat: number; lon: number }) : null;
  } catch {
    return null;
  }
}

export function writeCachedCoords(lat: number, lon: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
  } catch {
    /* ignore quota */
  }
}

// 조회에 실패했을 때 쓰던 기본값(Seoul 18° 맑음)은 없앴다. 그럴듯한 숫자라
// 사용자가 실제 날씨로 믿게 되는데, 화면에는 진짜와 구분할 표시가 없었다.
// 지금은 받아 둔 캐시가 있으면 "최근"으로 표시하고, 없으면 없다고 말한다.

export function weatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
