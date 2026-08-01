"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
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
  weatherFallback,
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

type WeatherState = {
  weather: WeatherData;
  loading: boolean;
  stale: boolean;
};

/** SSR·첫 클라이언트 렌더는 동일 HTML — localStorage는 mount 후에만 읽음 */
// 테스트를 위해 임시로 사용
function ssrSafeInitialState(): WeatherState {
  return {
    weather: weatherFallback(),
    loading: true,
    stale: false,
  };
}

export function WeatherWidget() {
  const [state, setState] = useState<WeatherState>(ssrSafeInitialState);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const cached = readCachedCoords();
      const data = await fetchWeather(
        cached
          ? { kind: "coords", lat: cached.lat, lon: cached.lon }
          : { kind: "city", city: "Seoul", country: "KR" },
      );
      setState({ weather: data, loading: false, stale: false });
    } catch {
      setState({
        weather: weatherFallback(),
        loading: false,
        stale: true,
      });
    }
  }, []);

  useEffect(() => {
    const cached = readCachedWeather();
    if (cached) {
      // 캐시된 날씨는 localStorage에 있어 SSR에서 접근 불가 — 마운트 후 복원이 필수다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ weather: cached, loading: false, stale: true });
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

  const Icon = weatherIconForCode(state.weather.icon);

  return (
    <button
      type="button"
      onClick={useMyLocation}
      className={cn(
        "pointer-events-auto self-end",
        "flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-1.5",
        "text-xs text-muted-foreground shadow-sm backdrop-blur-md",
      )}
      aria-label="현재 위치의 날씨 보기"
    >
      {state.loading && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden />
      )}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/90 ring-1 ring-border/50"
        aria-hidden
      >
        {/* eslint-disable-next-line react-hooks/static-components -- weatherIconForCode는 항상
            위에서 import한 안정된 lucide 아이콘 컴포넌트 중 하나를 그대로 반환할 뿐, 새 컴포넌트를
            만들지 않는다 */}
        <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      </span>
      <span className="font-medium text-foreground tabular-nums">
        {Math.round(state.weather.temp_c)}°
      </span>
      <span className="text-foreground/80">{state.weather.description}</span>
      <span className="text-muted-foreground/80">· {state.weather.city}</span>
      {state.stale && !state.loading && (
        <span className="sr-only">캐시 또는 기본 날씨 표시</span>
      )}
    </button>
  );
}
