export function KpiCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  hint?: string;
}) {
  return (
    <div className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-3 min-w-0">
      <div className="text-[11px] text-ink/55 uppercase tracking-wide truncate">{label}</div>
      <div className="text-[22px] font-semibold font-mono mt-1 truncate">{value}</div>
      {delta && (
        <div
          className={
            "text-[11px] mt-0.5 font-mono " +
            (delta.positive ? "text-[var(--success)]" : "text-ink/50")
          }
        >
          {delta.value}
        </div>
      )}
      {hint && <div className="text-[11px] text-ink/40 mt-0.5">{hint}</div>}
    </div>
  );
}

export function KpiSkeleton() {
  return <div className="h-[88px] rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse" />;
}
