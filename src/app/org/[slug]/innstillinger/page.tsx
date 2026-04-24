import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgInnstillingerForm } from "./OrgInnstillingerForm";

export default async function OrgInnstillingerPage({
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
      name: true,
      displayName: true,
      logoUrl: true,
      brandColor: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();
  if (org.memberships[0].role !== "admin") notFound();

  return (
    <div className="min-h-dvh bg-bg p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/org/${slug}`} className="text-[13px] text-ink/50 hover:text-ink transition-colors">
          ← {org.displayName}
        </Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-8">Innstillinger</h1>
      <OrgInnstillingerForm
        slug={slug}
        initial={{ name: org.name, displayName: org.displayName, logoUrl: org.logoUrl, brandColor: org.brandColor }}
      />
    </div>
  );
}
