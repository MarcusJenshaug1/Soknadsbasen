"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useSessionStore } from "@/store/useSessionStore";
import { IconChevronDown } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

/**
 * Rask kontekst-bytter for mobil. Full livssyklus (start / avslutt / gi nytt
 * navn / gjenåpne) bor på /app/sesjoner — denne viser aktiv sesjon, lar deg
 * hoppe til en tidligere pipeline, og lenker til den autoritative flaten.
 */
export function MobileSessionBar() {
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

  const closedSessions = sessions.filter((s) => s.status === "CLOSED").slice(0, 3);

  return (
    <div ref={ref} className="md:hidden sticky top-0 z-30 print:hidden">
      {/* Notch-bar */}
      <div className="bg-bg/95 backdrop-blur-sm border-b border-black/6 dark:border-white/6 px-4 h-9 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-ink/40 shrink-0">
          Sesjon
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-[12px] font-medium text-ink truncate max-w-[70%]"
        >
          <span className="truncate">
            {activeSession?.name ?? "Ingen aktiv sesjon"}
          </span>
          <IconChevronDown
            size={12}
            className={cn("shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {/* Rullegardin */}
      {open && (
        <div className="absolute top-full left-0 right-0 bg-bg border-b border-black/8 dark:border-white/8 shadow-lg">
          {activeSession && (
            <div className="px-4 py-3 border-b border-black/6 dark:border-white/6 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
              <span className="text-[12px] font-medium truncate">
                {activeSession.name}
              </span>
            </div>
          )}

          {closedSessions.length > 0 && (
            <div className="px-4 py-2 border-b border-black/6 dark:border-white/6 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-ink/40 mb-1.5">
                Tidligere
              </div>
              {closedSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/app/pipeline?session=${s.id}`}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-1.5 text-[12px] hover:text-accent transition-colors"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-ink/40 ml-2 shrink-0">
                    {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="px-4 py-3">
            <Link
              href="/app/sesjoner"
              prefetch={true}
              onClick={() => setOpen(false)}
              className="block text-center text-[11px] text-ink/50 hover:text-ink transition-colors"
            >
              Administrer sesjoner
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
