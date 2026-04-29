"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIOD_OPTIONS = [
  { id: "30d", label: "Siste 30 dager" },
  { id: "90d", label: "Siste 90 dager" },
  { id: "year", label: "Hele 2026" },
] as const;

interface SessionOption {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
}

interface Props {
  currentPeriod: string;
  currentScope: string;
  sessions: SessionOption[];
  hasActive: boolean;
}

export function InnsiktFilters({ currentPeriod, currentScope, sessions, hasActive }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function setScope(next: string) {
    const sp = new URLSearchParams(params);
    if (next === "period") {
      sp.delete("session");
    } else {
      sp.set("session", next);
      sp.delete("period");
    }
    router.push(`?${sp.toString()}`);
  }

  function setPeriod(next: string) {
    const sp = new URLSearchParams(params);
    sp.set("period", next);
    sp.delete("session");
    router.push(`?${sp.toString()}`);
  }

  const SELECT =
    "bg-surface border border-black/10 dark:border-white/10 rounded-full px-4 py-2 text-[12px] outline-none focus:border-accent";

  const isPeriodMode = currentScope === "period";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentScope}
        onChange={(e) => setScope(e.target.value)}
        className={SELECT}
      >
        <option value="period">Periode</option>
        <option value="all">Alle sesjoner</option>
        {hasActive && <option value="active">Aktiv sesjon</option>}
        {sessions.length > 0 && (
          <optgroup label="Velg sesjon">
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.status === "ACTIVE" ? " (aktiv)" : ""}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      {isPeriodMode && (
        <select
          value={currentPeriod}
          onChange={(e) => setPeriod(e.target.value)}
          className={SELECT}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
