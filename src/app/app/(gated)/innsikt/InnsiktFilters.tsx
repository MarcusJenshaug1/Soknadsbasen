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
  currentSession: string | null;
  sessions: SessionOption[];
}

export function InnsiktFilters({ currentPeriod, currentSession, sessions }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function setPeriod(next: string) {
    const sp = new URLSearchParams(params);
    sp.set("period", next);
    sp.delete("session");
    router.push(`?${sp.toString()}`);
  }

  function setSession(next: string) {
    const sp = new URLSearchParams(params);
    if (next === "") {
      sp.delete("session");
    } else {
      sp.set("session", next);
      sp.delete("period");
    }
    router.push(`?${sp.toString()}`);
  }

  const SELECT =
    "bg-white border border-black/10 rounded-full px-4 py-2 text-[12px] outline-none focus:border-[#c15a3a]";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={currentSession ?? ""}
        onChange={(e) => setSession(e.target.value)}
        className={SELECT}
      >
        <option value="">Alle perioder</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}{s.status === "ACTIVE" ? " (aktiv)" : ""}
          </option>
        ))}
      </select>

      {!currentSession && (
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
