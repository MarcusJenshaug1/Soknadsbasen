import { getSalesRepMrrThisMonth } from "@/lib/sales/metrics";
import { formatNok } from "@/lib/sales/format";
import { WidgetShell, EmptyState } from "./WidgetShell";

export async function MrrProgress({
  salesRepId,
  quotaCents,
}: {
  salesRepId: string;
  quotaCents: number;
}) {
  const mrrCents = await getSalesRepMrrThisMonth(salesRepId);
  const pct = quotaCents > 0 ? Math.min(100, (mrrCents / quotaCents) * 100) : 0;
  const monthName = new Date().toLocaleDateString("nb-NO", { month: "long" });

  if (quotaCents === 0) {
    return (
      <WidgetShell title="MRR-mål">
        <EmptyState
          title="Ingen kvota satt"
          hint="Be admin sette månedlig MRR-mål for å spore framdrift."
        />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={`MRR ${monthName}`}>
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-mono text-[22px] font-semibold">{formatNok(mrrCents)}</div>
        <div className="text-[12px] text-ink/55 font-mono">
          / {formatNok(quotaCents)}
        </div>
      </div>
      <div className="relative h-[22px] rounded-full bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "var(--success)",
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-ink/45 font-mono mt-2">
        <span>0</span>
        <span className="text-ink/70">{pct.toFixed(0)}%</span>
        <span>{formatNok(quotaCents, { compact: true })}</span>
      </div>
    </WidgetShell>
  );
}
