import { prisma } from "@/lib/prisma";
import { BrukereClient, type AdminStats } from "./BrukereClient";

export const dynamic = "force-dynamic";

export default async function AdminBrukerePage() {
  const now = new Date();
  // Globale tall i én batch (perf-regel) — listen under er capped til 50.
  const [
    users,
    total,
    betalende,
    prove,
    admins,
    evigAi,
    orgMedlemmer,
  ] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        aiUnlimited: true,
        createdAt: true,
        subscription: { select: { status: true, type: true, currentPeriodEnd: true } },
        orgMemberships: {
          where: { status: "active" },
          select: { role: true, org: { select: { slug: true, displayName: true } } },
          take: 1,
        },
      },
    }),
    prisma.user.count(),
    prisma.subscription.count({
      where: { status: "active", currentPeriodEnd: { gt: now } },
    }),
    prisma.subscription.count({
      where: { status: "trialing", currentPeriodEnd: { gt: now } },
    }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { aiUnlimited: true } }),
    prisma.user.count({ where: { orgMemberships: { some: { status: "active" } } } }),
  ]);

  const stats: AdminStats = { total, betalende, prove, admins, evigAi, orgMedlemmer };

  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-6">Brukere</h1>
      <BrukereClient
        initialUsers={users}
        adminEmail={process.env.ADMIN_EMAIL ?? ""}
        stats={stats}
      />
    </div>
  );
}
