import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const GEO_API = "https://geocoding-api.open-meteo.com/v1/search";

type GeoResult = {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
};

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    relative_humidity_2m: number;
  };
};

function weatherCodeToDescription(code: number): { description: string; icon: string } {
  if (code === 0) return { description: "맑음", icon: "01d" };
  if (code <= 3) return { description: "구름 조금", icon: "02d" };
  if (code <= 48) return { description: "안개", icon: "50d" };
  if (code <= 57) return { description: "이슬비", icon: "09d" };
  if (code <= 67) return { description: "비", icon: "10d" };
  if (code <= 77) return { description: "눈", icon: "13d" };
  if (code <= 82) return { description: "소나기", icon: "09d" };
  if (code <= 99) return { description: "뇌우", icon: "11d" };
  return { description: "흐림", icon: "03d" };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const city = searchParams.get("city");
  const country = searchParams.get("country");

  let latitude: number;
  let longitude: number;
  let cityName: string;
  let countryName: string;

  if (lat && lon) {
    latitude = parseFloat(lat);
    longitude = parseFloat(lon);
    cityName = "현재 위치";
    countryName = "";
  } else if (city) {
    const q = country ? `${city},${country}` : city;
    const geoRes = await fetch(`${GEO_API}?name=${encodeURIComponent(q)}&count=1&language=ko`);
    if (!geoRes.ok) {
      return NextResponse.json({ detail: "위치 검색 실패" }, { status: 502 });
    }
    const geoData = (await geoRes.json()) as { results?: GeoResult[] };
    const result = geoData.results?.[0];
    if (!result) {
      return NextResponse.json({ detail: "도시를 찾을 수 없습니다" }, { status: 404 });
    }
    latitude = result.latitude;
    longitude = result.longitude;
    cityName = result.name;
    countryName = result.country;
  } else {
    return NextResponse.json({ detail: "lat/lon 또는 city 파라미터가 필요합니다" }, { status: 400 });
  }

  const url = `${OPEN_METEO}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m&timezone=auto`;
  const meteoRes = await fetch(url, { next: { revalidate: 600 } });
  if (!meteoRes.ok) {
    return NextResponse.json({ detail: "날씨 데이터 조회 실패" }, { status: 502 });
  }
  const meteoData = (await meteoRes.json()) as OpenMeteoResponse;
  const cur = meteoData.current;
  const { description, icon } = weatherCodeToDescription(cur.weather_code);

  return NextResponse.json({
    city: cityName,
    country: countryName,
    temp_c: Math.round(cur.temperature_2m * 10) / 10,
    feels_like_c: Math.round(cur.apparent_temperature * 10) / 10,
    description,
    icon,
    humidity: cur.relative_humidity_2m,
  });
}
