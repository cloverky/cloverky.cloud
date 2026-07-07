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

const FALLBACK_WEATHER: WeatherData = {
  city: "Seoul",
  country: "KR",
  temp_c: 18,
  feels_like_c: 18,
  description: "맑음",
  icon: "01d",
  humidity: 55,
};

export async function fetchWeather(city = "Seoul", country = "KR"): Promise<WeatherData> {
  const params = new URLSearchParams({ city, country });
  const res = await fetch(`${API_BASE}/weather?${params}`, { cache: "no-store" });
  const data = (await res.json()) as WeatherData & FastApiErrorBody;

  if (!res.ok) {
    throw new Error(parseApiError(data, res.status));
  }

  writeCachedWeather(data);
  return data;
}

/** API·백엔드 실패 시 기본값 (SSR·hydration용 — 캐시는 컴포넌트 mount 후 적용) */
export function weatherFallback(): WeatherData {
  return FALLBACK_WEATHER;
}

export function weatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
