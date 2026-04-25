import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok, formatDateNb, startOfMonth } from "@/lib/sales/format";

export const dynamic = "force-dynamic";

const RANK_BG = ["bg-[var(--sales-rank-1)]", "bg-[var(--sales-rank-2)]", "bg-[var(--sales-rank-3)]"];
const RANK_FG = ["text-[#5C3D02]", "text-white", "text-white"];

function periodFor(periodId: string): { gte: Date; lt: Date | undefined; label: string } {
  const now = new Date();
  if (periodId === "lastMonth") {
    const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const next = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: m, lt: next, label: m.toLocaleDateString("nb-NO", { month: "long", year: "numeric" }) };
  }
  if (periodId === "all") {
    return { gte: new Date(2000, 0, 1), lt: undefined, label: "Hele perioden" };
  }
  const m = startOfMonth(now);
  return { gte: m, lt: undefined, label: now.toLocaleDateString("nb-NO", { month: "long", year: "numeric" }) };
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/leaderboard");
  const sp = await searchParams;
  const periodId = sp.period ?? "thisMonth";
  const period = periodFor(periodId);

  const reps = await prisma.salesRepProfile.findMany({
    where: { status: "active" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  const rows = await Promise.all(
    reps.map(async (rep) => {
      const dateFilter = period.lt
        ? { gte: period.gte, lt: period.lt }
        : { gte: period.gte };
      const [sums, won, lastWon] = await Promise.all([
        prisma.commissionEntry.aggregate({
          where: {
            salesRepId: rep.userId,
            paidAt: dateFilter,
            status: { in: ["pending", "eligible", "paid"] },
          },
          _sum: { invoiceAmountCents: true, amountCents: true },
        }),
        prisma.lead.count({
          where: {
            salesRepId: rep.userId,
            stage: "Vunnet",
            closedAt: dateFilter,
          },
        }),
        prisma.lead.findFirst({
          where: { salesRepId: rep.userId, stage: "Vunnet" },
          orderBy: { closedAt: "desc" },
          select: { closedAt: true },
        }),
      ]);
      return {
        userId: rep.userId,
        name: rep.user.name,
        email: rep.user.email,
        mrrCents: sums._sum.invoiceAmountCents ?? 0,
        commissionCents: sums._sum.amountCents ?? 0,
        wonCount: won,
        quotaCents: rep.monthlyQuotaCents,
        lastWonAt: lastWon?.closedAt ?? null,
      };
    }),
  );
  rows.sort((a, b) => b.mrrCents - a.mrrCents);

  const PERIODS: { id: string; label: string }[] = [
    { id: "thisMonth", label: "Denne mnd" },
    { id: "lastMonth", label: "Forrige mnd" },
    { id: "all", label: "All-time" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Leaderboard</h1>
          <p className="text-[12px] text-ink/55 mt-0.5">{period.label} · {rows.length} aktive selgere</p>
        </div>
        <nav className="flex items-center gap-1 rounded-full bg-black/[0.05] dark:bg-white/[0.05] p-0.5">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/selger/leaderboard?period=${p.id}`}
              prefetch={true}
              className={
                "px-3 py-1 rounded-full text-[11px] transition-colors " +
                (p.id === periodId ? "bg-bg text-ink shadow-sm" : "text-ink/55 hover:text-ink")
              }
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Ingen aktive selgere ennå</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/8 bg-surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02]">
                <th className="text-left px-4 py-2 font-medium w-12">Rang</th>
                <th className="text-left px-4 py-2 font-medium">Navn</th>
                <th className="text-right px-4 py-2 font-medium">MRR</th>
                <th className="text-right px-4 py-2 font-medium">Provisjon</th>
                <th className="text-right px-4 py-2 font-medium">Quota %</th>
                <th className="text-right px-4 py-2 font-medium">Vunnet</th>
                <th className="text-right px-4 py-2 font-medium">Siste deal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isMe = row.userId === access.userId;
                const quotaPct =
                  row.quotaCents > 0 ? Math.round((row.mrrCents / row.quotaCents) * 100) : 0;
                return (
                  <tr
                    key={row.userId}
                    className={
                      "border-t border-black/6 transition-colors " +
                      (isMe ? "bg-[var(--accent)]/5" : "hover:bg-black/[0.02]")
                    }
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          "inline-flex w-6 h-6 rounded-full text-[11px] font-mono font-semibold items-center justify-center " +
                          (i < 3
                            ? `${RANK_BG[i]} ${RANK_FG[i]}`
                            : "bg-black/[0.06] text-ink/55")
                        }
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={isMe ? "font-semibold" : ""}>
                        {row.name ?? row.email.split("@")[0]}
                      </span>
                      {isMe && <span className="text-ink/55 font-normal text-[11px]"> (deg)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatNok(row.mrrCents, { compact: true })}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatNok(row.commissionCents, { compact: true })}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink/65">
                      {row.quotaCents > 0 ? `${quotaPct}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{row.wonCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-ink/55">
                      {row.lastWonAt ? formatDateNb(row.lastWonAt) : "—"}
                    </td>
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
