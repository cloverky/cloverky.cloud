import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, signRefreshToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email: string; password: string };

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true, name: true, username: true, email: true, passwordHash: true, role: true },
  });

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return NextResponse.json({ detail: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const payload = {
    sub: String(user.id),
    email: user.email,
    name: user.name,
    username: user.username,
    role: user.role,
  };

  const [accessToken, refreshToken] = await Promise.all([
    signToken(payload),
    signRefreshToken(payload),
  ]);

  const res = NextResponse.json({
    message: "로그인 성공",
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  });

  res.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10분
  });

  res.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });

  return res;
}
