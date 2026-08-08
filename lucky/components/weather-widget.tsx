"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  fetchWeather,
  readCachedCoords,
  readCachedWeather,
  writeCachedCoords,
  type WeatherData,
} from "@/lib/weather-api";
import { cn } from "@/lib/utils";

const REFRESH_MS = 10 * 60 * 1000;

function weatherIconForCode(icon: string): LucideIcon {
  const code = icon.slice(0, 2);
  if (code === "01") return icon.endsWith("n") ? Moon : Sun;
  if (code === "02") return icon.endsWith("n") ? CloudMoon : CloudSun;
  if (code === "03" || code === "04") return Cloud;
  if (code === "09" || code === "10") return CloudRain;
  if (code === "11") return CloudLightning;
  if (code === "13") return CloudSnow;
  if (code === "50") return CloudFog;
  return Cloud;
}

/**
 * live   — 방금 받아온 날씨.
 * cached — 지난번에 받아 둔 진짜 날씨. 값은 맞지만 지금 것이 아니다.
 * none   — 받아온 적이 없다. 이때 그럴듯한 숫자를 지어내면 사용자가 속는다.
 */
type Source = "live" | "cached" | "none";

type WeatherState = {
  weather: WeatherData | null;
  loading: boolean;
  source: Source;
};

/** SSR·첫 클라이언트 렌더는 동일 HTML — localStorage 는 mount 후에만 읽는다. */
const INITIAL_STATE: WeatherState = {
  weather: null,
  loading: true,
  source: "none",
};

export function WeatherWidget() {
  const [state, setState] = useState<WeatherState>(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const cached = readCachedCoords();
      const data = await fetchWeather(
        cached
          ? { kind: "coords", lat: cached.lat, lon: cached.lon }
          : { kind: "city", city: "Seoul", country: "KR" },
      );
      setState({ weather: data, loading: false, source: "live" });
    } catch {
      // 실패했다고 지어낸 날씨로 덮지 않는다. 받아 둔 게 있으면 그걸 그대로 두고,
      // 없으면 없다고 말한다.
      setState((prev) => ({
        weather: prev.weather,
        loading: false,
        source: prev.weather ? "cached" : "none",
      }));
    }
  }, []);

  useEffect(() => {
    const cached = readCachedWeather();
    if (cached) {
      // 캐시는 localStorage 에 있어 SSR 에서 못 읽는다 — 마운트 후 복원이 필수다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ weather: cached, loading: false, source: "cached" });
    }
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        writeCachedCoords(coords.latitude, coords.longitude);
        void load();
      },
      // 거부·타임아웃 모두 조용히 넘어간다. 지금 보이는 날씨가 그대로 남는다.
      () => undefined,
      { timeout: 8000, maximumAge: 10 * 60 * 1000 },
    );
  }, [load]);

  const { weather, loading, source } = state;
  const Icon = weather ? weatherIconForCode(weather.icon) : CloudOff;

  return (
    <button
      type="button"
      onClick={useMyLocation}
      title={
        source === "cached"
          ? "마지막으로 받아 둔 날씨입니다. 지금 날씨와 다를 수 있습니다."
          : source === "none"
            ? "날씨를 불러오지 못했습니다."
            : "현재 위치의 날씨 보기"
      }
      className={cn(
        "pointer-events-auto self-end",
        "flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-1.5",
        "text-xs text-muted-foreground shadow-sm backdrop-blur-md",
      )}
      aria-label="현재 위치의 날씨 보기"
    >
      {loading && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden />
      )}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/90 ring-1 ring-border/50"
        aria-hidden
      >
        {/* eslint-disable-next-line react-hooks/static-components -- weatherIconForCode는 항상
            위에서 import한 안정된 lucide 아이콘 컴포넌트 중 하나를 그대로 반환할 뿐, 새 컴포넌트를
            만들지 않는다 */}
        <Icon
          className={cn(
            "h-4 w-4",
            weather ? "text-accent" : "text-muted-foreground/70",
          )}
          strokeWidth={2}
        />
      </span>

      {weather ? (
        <>
          <span className="font-medium text-foreground tabular-nums">
            {Math.round(weather.temp_c)}°
          </span>
          <span className="text-foreground/80">{weather.description}</span>
          <span className="text-muted-foreground/80">· {weather.city}</span>
          {source === "cached" && !loading && (
            <span className="text-muted-foreground/70">· 최근</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">
          {loading ? "날씨 확인 중" : "날씨 정보 없음"}
        </span>
      )}
    </button>
  );
}
