"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";
import { CloseSessionModal } from "./CloseSessionModal";
import { NewSessionModal } from "./NewSessionModal";
import { cn } from "@/lib/cn";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

export function SessionSwitcher() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessions = useSessionStore((s) => s.sessions);
  const load = useSessionStore((s) => s.load);
  const reopen = useSessionStore((s) => s.reopen);

  const [open, setOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [reopening, setReopening] = useState<string | null>(null);
  const router = useRouter();
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

  async function handleReopen(id: string) {
    setReopening(id);
    try {
      await reopen(id);
      setOpen(false);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Feil");
    } finally {
      setReopening(null);
    }
  }

  const startLabel = activeSession
    ? new Date(activeSession.startedAt).toLocaleDateString("nb-NO", {
        day: "numeric", month: "short",
      })
    : null;

  return (
    <>
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
          <div className="text-[10px] uppercase tracking-wider text-[#14110e]/45 dark:text-[#f0ece6]/45 mb-0.5">
            Aktiv søkerunde
          </div>
          <div className="font-medium text-ink truncate">
            {activeSession?.name ?? "Ingen aktiv sesjon"}
          </div>
          {startLabel && (
            <div className="text-[10px] text-[#14110e]/45 dark:text-[#f0ece6]/45 mt-0.5">siden {startLabel}</div>
          )}
        </button>

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-bg border border-black/10 dark:border-white/10 rounded-2xl shadow-lg overflow-hidden z-40">
            {activeSession && (
              <div className="px-4 py-3 border-b border-black/8 dark:border-white/8">
                <div className="text-[10px] uppercase tracking-wider text-[#14110e]/45 dark:text-[#f0ece6]/45 mb-2">Denne sesjonen</div>
                <button
                  onClick={() => { setShowClose(true); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-accent hover:bg-accent/8 transition-colors"
                >
                  Avslutt sesjon …
                </button>
              </div>
            )}

            {closedSessions.length > 0 && (
              <div className="px-4 py-3 border-b border-black/8 dark:border-white/8 max-h-48 overflow-y-auto">
                <div className="text-[10px] uppercase tracking-wider text-[#14110e]/45 dark:text-[#f0ece6]/45 mb-2">Tidligere sesjoner</div>
                <div className="space-y-1">
                  {closedSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium truncate">{s.name}</div>
                        <div className="text-[10px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
                          {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                          {" · "}{s._count.applications} søknader
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={`/app/pipeline?session=${s.id}`}
                          onClick={() => setOpen(false)}
                          className="px-2 py-1 rounded-lg text-[11px] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors"
                        >
                          Se
                        </Link>
                        {!activeSession && (
                          <button
                            onClick={() => handleReopen(s.id)}
                            disabled={reopening === s.id}
                            className="px-2 py-1 rounded-lg text-[11px] border border-black/10 hover:border-black/25 transition-colors disabled:opacity-50"
                          >
                            {reopening === s.id ? "…" : "Åpne"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3">
              {!activeSession ? (
                <button
                  onClick={() => { setShowNew(true); setOpen(false); }}
                  className="w-full px-3 py-2 rounded-xl text-[12px] bg-accent text-bg hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
                >
                  Start ny sesjon
                </button>
              ) : (
                <Link
                  href="/app/sesjoner"
                  onClick={() => setOpen(false)}
                  className="block text-center text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:text-ink transition-colors"
                >
                  Se alle sesjoner
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <CloseSessionModal open={showClose} onClose={() => setShowClose(false)} />
      <NewSessionModal open={showNew} onClose={() => setShowNew(false)} />
    </>
  );
}
