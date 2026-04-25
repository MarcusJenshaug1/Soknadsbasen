import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok, relativeNb } from "@/lib/sales/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøvetid",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  incomplete: "Ufullstendig",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-[var(--success)]",
  trialing: "bg-[var(--sales-stage-kontaktet)]",
  past_due: "bg-[var(--sales-commission-eligible)]",
  canceled: "bg-[var(--sales-stage-tapt)]",
  incomplete: "bg-[var(--sales-commission-pending)]",
};

export default async function KunderPage() {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/kunder");

  const orgs = await prisma.organization.findMany({
    where: access.viewerRole === "admin" ? {} : { salesRepId: access.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      displayName: true,
      status: true,
      seatLimit: true,
      createdAt: true,
      salesRepId: true,
      _count: { select: { commissionEntries: true } },
    },
  });

  const totalCommissions = await prisma.commissionEntry.aggregate({
    where: {
      ...(access.viewerRole === "admin" ? {} : { salesRepId: access.userId }),
      status: { in: ["pending", "eligible", "paid"] },
    },
    _sum: { amountCents: true },
  });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Mine kunder</h1>
          <p className="text-[12px] text-ink/55 mt-0.5 font-mono">
            {orgs.length} {orgs.length === 1 ? "kunde" : "kunder"} · {formatNok(totalCommissions._sum.amountCents ?? 0, { compact: true })} opptjent
          </p>
        </div>
        <Link
          href="/selger/kunder/ny"
          prefetch={true}
          className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 transition-opacity"
        >
          + Ny kunde
        </Link>
      </header>

      {orgs.length === 0 ? (
        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Ingen kunder ennå</p>
          <p className="text-[12px] text-ink/55 mt-1">
            Konverter en lead, eller opprett en kunde direkte.
          </p>
          <Link
            href="/selger/kunder/ny"
            prefetch={true}
            className="inline-block mt-4 px-3 py-1.5 rounded-full bg-ink text-bg text-[12px]"
          >
            Opprett første kunde
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02] dark:bg-white/[0.03]">
                <th className="text-left px-4 py-2 font-medium">Bedrift</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Lisenser</th>
                <th className="text-right px-4 py-2 font-medium">Provisjons-entries</th>
                <th className="text-right px-4 py-2 font-medium">Opprettet</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-black/6 dark:border-white/6 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/selger/kunder/${o.id}`} prefetch={true} className="hover:underline">
                      {o.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px]">
                      <span className={"w-1.5 h-1.5 rounded-full " + (STATUS_DOT[o.status] ?? "bg-ink/30")} aria-hidden />
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink/75">{o.seatLimit}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink/75">{o._count.commissionEntries}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink/55">{relativeNb(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
