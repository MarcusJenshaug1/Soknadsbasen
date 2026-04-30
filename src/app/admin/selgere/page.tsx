import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNok, relativeNb } from "@/lib/sales/format";
import { startOfMonth } from "@/lib/sales/format";
import { SelgereClient } from "./SelgereClient";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  invited: "Invitert",
  active: "Aktiv",
  suspended: "Suspendert",
};

const STATUS_DOT: Record<string, string> = {
  invited: "bg-[var(--sales-stage-kontaktet)]",
  active: "bg-[var(--success)]",
  suspended: "bg-[var(--sales-stage-tapt)]",
};

export default async function AdminSelgerePage() {
  const reps = await prisma.salesRepProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const monthStart = startOfMonth();
  const userIds = reps.map((r) => r.userId);

  const [mrrRows, eligibleRows] = await Promise.all([
    prisma.commissionEntry.groupBy({
      by: ["salesRepId"],
      where: {
        salesRepId: { in: userIds },
        paidAt: { gte: monthStart },
        status: { in: ["pending", "eligible", "paid"] },
      },
      _sum: { invoiceAmountCents: true },
    }),
    prisma.commissionEntry.groupBy({
      by: ["salesRepId"],
      where: { salesRepId: { in: userIds }, status: "eligible" },
      _sum: { amountCents: true },
    }),
  ]);

  const mrrMap = new Map(mrrRows.map((r) => [r.salesRepId, r._sum.invoiceAmountCents ?? 0]));
  const eligibleMap = new Map(eligibleRows.map((r) => [r.salesRepId, r._sum.amountCents ?? 0]));
  const statsMap = new Map(
    userIds.map((id) => [
      id,
      { userId: id, mrrCents: mrrMap.get(id) ?? 0, eligibleCents: eligibleMap.get(id) ?? 0 },
    ]),
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Selgere</h1>
          <p className="text-[12px] text-ink/55 mt-0.5">{reps.length} totalt</p>
        </div>
        <SelgereClient />
      </header>

      {reps.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Ingen selgere ennå</p>
          <p className="text-[12px] text-ink/55 mt-1">Inviter en selger for å komme i gang.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/8 bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02]">
                <th className="text-left px-4 py-2 font-medium">Navn</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Rate</th>
                <th className="text-right px-4 py-2 font-medium">Kvota</th>
                <th className="text-right px-4 py-2 font-medium">MRR mnd</th>
                <th className="text-right px-4 py-2 font-medium">Klar utbet.</th>
                <th className="text-right px-4 py-2 font-medium">Lagt til</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => {
                const s = statsMap.get(rep.userId);
                const eligible = s?.eligibleCents ?? 0;
                return (
                  <tr key={rep.id} className="border-t border-black/6 hover:bg-black/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/selgere/${rep.id}`} className="hover:underline">
                        {rep.user.name ?? rep.user.email.split("@")[0]}
                      </Link>
                      <div className="text-[10px] text-ink/45 truncate">{rep.user.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px]">
                        <span className={"w-1.5 h-1.5 rounded-full " + (STATUS_DOT[rep.status] ?? "bg-ink/30")} aria-hidden />
                        {STATUS_LABEL[rep.status] ?? rep.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{(rep.commissionRateBp / 100).toFixed(0)}%</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatNok(rep.monthlyQuotaCents, { compact: true })}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatNok(s?.mrrCents ?? 0, { compact: true })}</td>
                    <td
                      className={
                        "px-4 py-2.5 text-right font-mono " +
                        (eligible > 0 ? "text-[var(--sales-commission-eligible)]" : "text-ink/55")
                      }
                    >
                      {formatNok(eligible, { compact: true })}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink/55">{relativeNb(rep.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
