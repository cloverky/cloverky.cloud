import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/jwt";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ detail: "인증이 필요합니다." }, { status: 401 });
  }

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword: string;
    newPassword: string;
  };

  const dbUser = await prisma.user.findUnique({
    where: { id: parseInt(user.sub) },
    select: { passwordHash: true },
  });

  if (!dbUser || !(await bcrypt.compare(currentPassword, dbUser.passwordHash))) {
    return NextResponse.json({ detail: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: parseInt(user.sub) }, data: { passwordHash } });

  return NextResponse.json({ message: "비밀번호 변경 완료" });
}
