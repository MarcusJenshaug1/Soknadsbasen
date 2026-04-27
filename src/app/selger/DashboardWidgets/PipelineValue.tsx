import { getPipelineByStage } from "@/lib/sales/metrics";
import { formatNok } from "@/lib/sales/format";
import { PIPELINE_STAGES, KANBAN_STAGES } from "@/lib/sales/stages";
import { WidgetShell, EmptyState } from "./WidgetShell";

export async function PipelineValue({ salesRepId }: { salesRepId: string }) {
  const rows = await getPipelineByStage(salesRepId);
  const map = new Map(rows.map((r) => [r.stage, r]));
  const max = Math.max(1, ...rows.map((r) => r.valueCents));
  const total = rows.reduce((sum, r) => sum + r.valueCents, 0);

  if (total === 0) {
    return (
      <WidgetShell title="Pipeline-verdi" href="/selger/leads" cta="Til leads">
        <EmptyState
          title="Tom pipeline"
          hint="Opprett din første lead for å se verdi per stage."
          action={{ label: "Ny lead", href: "/selger/leads/ny" }}
        />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title="Pipeline-verdi" href="/selger/leads" cta="Til leads">
      <div className="space-y-1.5">
        {KANBAN_STAGES.map((stageId) => {
          const stage = PIPELINE_STAGES.find((s) => s.id === stageId)!;
          const row = map.get(stageId);
          const value = row?.valueCents ?? 0;
          const pct = (value / max) * 100;
          return (
            <div key={stageId} className="flex items-center gap-2">
              <span className="text-[11px] text-ink/65 w-[70px] truncate">{stage.label}</span>
              <div className="flex-1 h-[12px] rounded-full bg-black/[0.04] dark:bg-white/[0.05] relative">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: stage.color }}
                />
              </div>
              <span className="text-[11px] font-mono text-ink/70 w-[60px] text-right">
                {formatNok(value, { compact: true })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-ink/55 mt-3 pt-3 border-t border-black/6 dark:border-white/6">
        <span>Total i pipeline</span>
        <span className="font-mono text-ink/85">{formatNok(total)}</span>
      </div>
    </WidgetShell>
  );
}
