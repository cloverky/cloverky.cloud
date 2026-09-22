import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    agreeTerms: boolean;
  };

  if (!body.agreeTerms) {
    return NextResponse.json({ detail: "이용약관에 동의해야 합니다." }, { status: 400 });
  }
  if (body.password !== body.confirmPassword) {
    return NextResponse.json({ detail: "비밀번호가 일치하지 않습니다." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: body.email }, { username: body.username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === body.email ? "이메일" : "사용자명";
    return NextResponse.json({ detail: `이미 사용 중인 ${field}입니다.` }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: { name: body.name, username: body.username, email: body.email, passwordHash },
    select: { username: true, email: true },
  });

  return NextResponse.json({ message: "회원가입 완료", ...user }, { status: 201 });
}
