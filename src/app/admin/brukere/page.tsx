import { prisma } from "@/lib/prisma";
import { BrukereClient } from "./BrukereClient";

export const dynamic = "force-dynamic";

export default async function AdminBrukerePage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      createdAt: true,
      subscription: { select: { status: true, type: true, currentPeriodEnd: true } },
      orgMemberships: {
        where: { status: "active" },
        select: { role: true, org: { select: { slug: true, displayName: true } } },
        take: 1,
      },
    },
  });

  return (
    <div>
      <h1 className="text-[22px] font-semibold mb-8">Brukere</h1>
      <BrukereClient initialUsers={users} adminEmail={process.env.ADMIN_EMAIL ?? ""} />
    </div>
  );
}
