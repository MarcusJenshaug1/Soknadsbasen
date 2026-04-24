import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MedlemmerClient } from "./MedlemmerClient";

export default async function MedlemmerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) return null;

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      displayName: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();

  const members = await prisma.orgMembership.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      status: true,
      sharesDataWithOrg: true,
      user: { select: { id: true, email: true, name: true, avatarUrl: true } },
    },
  });

  return (
    <div className="min-h-dvh bg-bg p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/org/${slug}`} className="text-[13px] text-ink/50 hover:text-ink transition-colors">
          ← {org.displayName}
        </Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-2">Medlemmer</h1>
      <p className="text-[13px] text-ink/50 mb-8">
        Inviter brukere ved å skrive inn eposadressen deres.
      </p>
      <MedlemmerClient
        initialMembers={members}
        callerRole={org.memberships[0].role}
        slug={slug}
      />
    </div>
  );
}
