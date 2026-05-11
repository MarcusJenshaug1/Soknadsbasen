import { NextResponse } from "next/server";
import { getImpersonationContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const imp = await getImpersonationContext();
  if (!imp) {
    return NextResponse.json({ active: false });
  }
  const target = await prisma.user.findUnique({
    where: { id: imp.targetId },
    select: { email: true, name: true },
  });
  return NextResponse.json({
    active: true,
    adminEmail: imp.adminEmail,
    targetEmail: target?.email ?? null,
    targetName: target?.name ?? null,
  });
}
