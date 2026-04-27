export function formatNok(cents: number, opts: { compact?: boolean } = {}): string {
  const kr = cents / 100;
  if (opts.compact && Math.abs(kr) >= 1000) {
    if (Math.abs(kr) >= 1_000_000) return `${(kr / 1_000_000).toFixed(1)} mill kr`;
    return `${Math.round(kr / 1000)}k kr`;
  }
  return `${kr.toLocaleString("nb-NO", { maximumFractionDigits: 0 })} kr`;
}

export function formatPct(value: number, digits = 0): string {
  return `${value.toLocaleString("nb-NO", { maximumFractionDigits: digits })}%`;
}

export function startOfMonth(d = new Date()): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function startOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d = new Date()): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function relativeNb(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  const diffH = Math.round(diffMs / 3_600_000);
  const diffD = Math.round(diffMs / 86_400_000);
  if (Math.abs(diffMin) < 1) return "nå";
  if (Math.abs(diffMin) < 60) return diffMin > 0 ? `${diffMin} min siden` : `om ${-diffMin} min`;
  if (Math.abs(diffH) < 24) return diffH > 0 ? `${diffH} t siden` : `om ${-diffH} t`;
  if (Math.abs(diffD) < 7) return diffD > 0 ? `${diffD} d siden` : `om ${-diffD} d`;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

export function formatDateNb(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDueAt(date: Date | string | null | undefined): { label: string; overdue: boolean } {
  if (!date) return { label: "—", overdue: false };
  const d = typeof date === "string" ? new Date(date) : date;
  const today = startOfDay();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const dDay = startOfDay(d);
  if (dDay < today) return { label: relativeNb(d), overdue: true };
  if (dDay.getTime() === today.getTime()) return { label: "I dag", overdue: false };
  if (dDay.getTime() === tomorrow.getTime()) return { label: "I morgen", overdue: false };
  return { label: formatDateNb(d), overdue: false };
}
