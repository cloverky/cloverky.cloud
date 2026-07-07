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
  readCachedWeather,
  weatherFallback,
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
      const data = await fetchWeather("Seoul", "KR");
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
      setState({ weather: cached, loading: false, stale: true });
    }
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const Icon = weatherIconForCode(state.weather.icon);

  return (
    <aside
      className={cn(
        "pointer-events-auto self-end",
        "flex items-center gap-2 rounded-full border border-border/60 bg-card/75 px-3 py-1.5",
        "text-xs text-muted-foreground shadow-sm backdrop-blur-md",
      )}
      aria-label="서울 날씨"
    >
      {state.loading && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" aria-hidden />
      )}
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/90 ring-1 ring-border/50"
        aria-hidden
      >
        <Icon className="h-4 w-4 text-accent" strokeWidth={2} />
      </span>
      <span className="font-medium text-foreground tabular-nums">
        {Math.round(state.weather.temp_c)}°
      </span>
      <span className="text-foreground/80">{state.weather.description}</span>
      <span className="text-muted-foreground/80">· 서울</span>
      {state.stale && !state.loading && (
        <span className="sr-only">캐시 또는 기본 날씨 표시</span>
      )}
    </aside>
  );
}
