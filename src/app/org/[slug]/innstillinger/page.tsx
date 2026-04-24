import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgInnstillingerForm } from "./OrgInnstillingerForm";

export const dynamic = "force-dynamic";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Innstillinger</h1>
        <p className="text-[13px] text-ink/50 mt-0.5">
          Navn, logo og merkefarge for organisasjonen.
        </p>
      </div>

      <section className="border border-black/8 rounded-xl bg-bg p-6 max-w-2xl">
        <OrgInnstillingerForm
          slug={slug}
          initial={{
            name: org.name,
            displayName: org.displayName,
            logoUrl: org.logoUrl,
            brandColor: org.brandColor,
          }}
        />
      </section>
    </div>
  );
}
