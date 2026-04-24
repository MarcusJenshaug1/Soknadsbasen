import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MedlemmerClient } from "./MedlemmerClient";

export const dynamic = "force-dynamic";

export default async function MedlemmerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return null;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      seatLimit: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();

  // Server-render first page (50 newest). Client tar over deretter.
  const [firstPage, totalActive, totalInvited] = await Promise.all([
    prisma.orgMembership.findMany({
      where: { orgId: org.id, status: { in: ["active", "invited"] } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
      select: {
        id: true,
        role: true,
        status: true,
        sharesDataWithOrg: true,
        createdAt: true,
        user: { select: { id: true, email: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.orgMembership.count({ where: { orgId: org.id, status: "active" } }),
    prisma.orgMembership.count({ where: { orgId: org.id, status: "invited" } }),
  ]);

  const hasMore = firstPage.length > 50;
  const initialMembers = hasMore ? firstPage.slice(0, 50) : firstPage;
  const initialCursor = hasMore ? initialMembers[initialMembers.length - 1]?.id : null;

  return (
    <MedlemmerClient
      slug={slug}
      callerRole={org.memberships[0].role}
      seatLimit={org.seatLimit}
      initialMembers={initialMembers}
      initialCursor={initialCursor ?? null}
      totalActive={totalActive}
      totalInvited={totalInvited}
    />
  );
}
