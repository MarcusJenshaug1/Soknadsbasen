"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";
import { IconChevronDown } from "@/components/ui/Icons";
import { CloseSessionModal } from "./CloseSessionModal";
import { NewSessionModal } from "./NewSessionModal";
import { cn } from "@/lib/cn";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

export function MobileSessionBar() {
  const activeSession = useSessionStore((s) => s.activeSession);
  const sessions = useSessionStore((s) => s.sessions);
  const load = useSessionStore((s) => s.load);

  const [open, setOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newAfterClose, setNewAfterClose] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
        <span className="text-[10px] uppercase tracking-wider text-[#14110e]/40 dark:text-[#f0ece6]/40 shrink-0">
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
            <div className="px-4 py-3 border-b border-black/6 dark:border-white/6">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[12px] font-medium truncate">{activeSession.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowClose(true); setOpen(false); }}
                  className="text-[11px] text-accent hover:underline"
                >
                  Avslutt sesjon
                </button>
                <span className="text-[#14110e]/20 dark:text-[#f0ece6]/20 text-[11px]">·</span>
                <button
                  onClick={() => { setNewAfterClose(true); setShowClose(true); setOpen(false); }}
                  className="text-[11px] text-[#14110e]/50 dark:text-[#f0ece6]/50 hover:text-ink hover:underline"
                >
                  Start ny sesjon
                </button>
              </div>
            </div>
          )}

          {closedSessions.length > 0 && (
            <div className="px-4 py-2 border-b border-black/6 dark:border-white/6 space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-[#14110e]/40 dark:text-[#f0ece6]/40 mb-1.5">Tidligere</div>
              {closedSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/app/pipeline?session=${s.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between py-1.5 text-[12px] hover:text-accent transition-colors"
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-[#14110e]/40 dark:text-[#f0ece6]/40 ml-2 shrink-0">
                    {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                  </span>
                </Link>
              ))}
            </div>
          )}

          <div className="px-4 py-3">
            {activeSession ? (
              <Link
                href="/app/sesjoner"
                onClick={() => setOpen(false)}
                className="block text-center text-[11px] text-[#14110e]/50 dark:text-[#f0ece6]/50 hover:text-ink transition-colors"
              >
                Se alle sesjoner
              </Link>
            ) : (
              <button
                onClick={() => { setShowNew(true); setOpen(false); }}
                className="w-full py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
              >
                Start ny sesjon
              </button>
            )}
          </div>
        </div>
      )}

      <CloseSessionModal
        open={showClose}
        onClose={() => { setShowClose(false); setNewAfterClose(false); }}
        onSuccess={() => { if (newAfterClose) setShowNew(true); }}
      />
      <NewSessionModal open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
