import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/jwt";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({
    id: user.sub,
    email: user.email,
    name: user.name,
    username: user.username,
    role: user.role,
  });
}
