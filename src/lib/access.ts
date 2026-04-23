import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function hasActiveAccess(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });
  if (!sub) return false;
  return ACTIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > new Date();
}
