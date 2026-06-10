"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/useSessionStore";
import { cn } from "@/lib/cn";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

/**
 * Rask kontekst-bytter for sidebar. Full livssyklus (start / avslutt / gi nytt
 * navn / gjenåpne) bor på /app/sesjoner — denne lar deg bare se aktiv sesjon og
 * hoppe til en tidligere pipeline. «Administrer» lenker til den autoritative
 * flaten.
 */
export function SessionSwitcher() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessions = useSessionStore((s) => s.sessions);
  const load = useSessionStore((s) => s.load);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const closedSessions = sessions.filter((s) => s.status === "CLOSED");

  const startLabel = activeSession
    ? new Date(activeSession.startedAt).toLocaleDateString("nb-NO", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div ref={ref} className="relative mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full text-left px-3 py-2.5 rounded-2xl border transition-colors text-[12px]",
          open
            ? "bg-panel border-black/15 dark:border-white/15"
            : "border-black/8 dark:border-white/8 hover:bg-black/5 dark:hover:bg-white/5 hover:border-black/15 dark:hover:border-white/15",
        )}
      >
        <div className="text-[10px] uppercase tracking-wider text-ink/45 mb-0.5">
          Aktiv søkerunde
        </div>
        <div className="font-medium text-ink truncate">
          {activeSession?.name ?? "Ingen aktiv sesjon"}
        </div>
        {startLabel && (
          <div className="text-[10px] text-ink/45 mt-0.5">siden {startLabel}</div>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg border border-black/10 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden z-40">
          {closedSessions.length > 0 && (
            <div className="px-4 py-3 border-b border-black/8 dark:border-white/8 max-h-48 overflow-y-auto">
              <div className="text-[10px] uppercase tracking-wider text-ink/45 mb-2">
                Tidligere sesjoner
              </div>
              <div className="space-y-1">
                {closedSessions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/app/pipeline?session=${s.id}`}
                    prefetch={true}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium truncate">{s.name}</div>
                      <div className="text-[10px] text-ink/45">
                        {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                        {" · "}
                        {s._count.applications} søknader
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="px-4 py-3">
            <Link
              href="/app/sesjoner"
              prefetch={true}
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] text-ink/55 hover:text-ink transition-colors"
            >
              Administrer sesjoner
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
