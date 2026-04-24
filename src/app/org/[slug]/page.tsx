import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  past_due: "Betaling mislyktes",
  canceled: "Kansellert",
  incomplete: "Venter på betaling",
};

export default async function OrgDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ setup?: string }>;
}) {
  const { slug } = await params;
  const { setup } = await searchParams;
  const session = await getSession();
  if (!session) return null;

  const org = await prisma.organization.findUnique({
    where: { slug },
    include: {
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
      _count: { select: { memberships: { where: { status: "active" } } } },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  const isAdmin = org.memberships[0].role === "admin";

  return (
    <div className="min-h-dvh bg-bg p-6 md:p-10 max-w-2xl mx-auto">
      {setup === "ok" && (
        <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-[13px] text-green-800">
          Organisasjonen er satt opp. Inviter brukere for å komme i gang.
        </div>
      )}

      <div className="mb-8">
        {org.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={org.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain mb-4" />
        )}
        <h1 className="text-[24px] font-semibold text-ink">{org.displayName}</h1>
        <p className="text-[13px] text-ink/50 mt-1">{org.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-black/8 p-5">
          <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">Status</div>
          <div className="text-[16px] font-medium">{STATUS_LABELS[org.status] ?? org.status}</div>
        </div>
        <div className="rounded-2xl border border-black/8 p-5">
          <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-1">Aktive seter</div>
          <div className="text-[16px] font-medium">{org._count.memberships}</div>
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-3">
          <Link
            href={`/org/${slug}/medlemmer`}
            className="flex items-center justify-between w-full rounded-2xl border border-black/8 p-5 hover:bg-black/3 transition-colors"
          >
            <span className="text-[14px] font-medium">Medlemmer</span>
            <span className="text-ink/40">→</span>
          </Link>
          <Link
            href={`/org/${slug}/innstillinger`}
            className="flex items-center justify-between w-full rounded-2xl border border-black/8 p-5 hover:bg-black/3 transition-colors"
          >
            <span className="text-[14px] font-medium">Innstillinger</span>
            <span className="text-ink/40">→</span>
          </Link>
          <Link
            href={`/org/${slug}/fakturering`}
            className="flex items-center justify-between w-full rounded-2xl border border-black/8 p-5 hover:bg-black/3 transition-colors"
          >
            <span className="text-[14px] font-medium">Fakturering</span>
            <span className="text-ink/40">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
