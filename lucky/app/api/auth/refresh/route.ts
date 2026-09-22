import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, signToken, signRefreshToken } from "@/lib/jwt";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "리프레시 토큰이 없습니다." }, { status: 401 });
  }

  const payload = await verifyToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ detail: "유효하지 않은 리프레시 토큰입니다." }, { status: 401 });
  }

  const { sub, email, name, username, role } = payload;
  const newPayload = { sub, email, name, username, role };

  const [newAccess, newRefresh] = await Promise.all([
    signToken(newPayload),
    signRefreshToken(newPayload),
  ]);

  const res = NextResponse.json({ message: "토큰 갱신 완료" });

  res.cookies.set("access_token", newAccess, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  res.cookies.set("refresh_token", newRefresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
