"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES } from "@/lib/sales/stages";

const ALL_STAGES = PIPELINE_STAGES.filter((s) => s.id !== "Tapt");

export function StageEditor({
  leadId,
  currentStage,
  canConvert,
}: {
  leadId: string;
  currentStage: string;
  canConvert: boolean;
}) {
  const [optimistic, setOptimistic] = useState(currentStage);
  const [pending, startTransition] = useTransition();
  const [showLost, setShowLost] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const router = useRouter();

  function setStage(target: string, extra?: { lostReason?: string }) {
    if (target === optimistic) return;
    if (target === "Tapt" && !showLost) {
      setShowLost(true);
      return;
    }
    setOptimistic(target);
    startTransition(async () => {
      const res = await fetch(`/api/sales/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: target, ...(extra ?? {}) }),
      });
      if (!res.ok) {
        setOptimistic(currentStage);
        alert("Kunne ikke endre stage.");
        return;
      }
      setShowLost(false);
      router.refresh();
    });
  }

  const activeIndex = ALL_STAGES.findIndex((s) => s.id === optimistic);

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-4">
      <div className="grid grid-cols-6 gap-1">
        {ALL_STAGES.map((s, i) => {
          const isActive = s.id === optimistic;
          const isCompleted = i < activeIndex;
          const isFuture = i > activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              disabled={pending}
              onClick={() => setStage(s.id)}
              className={
                "px-2 py-2 rounded-lg text-[11px] text-left transition-colors disabled:opacity-60 " +
                (isActive
                  ? "text-white"
                  : isCompleted
                    ? "bg-black/[0.04] dark:bg-white/[0.06] text-ink/65 hover:bg-black/[0.08]"
                    : "bg-black/[0.03] dark:bg-white/[0.04] text-ink/45 hover:bg-black/[0.06]")
              }
              style={isActive ? { background: s.color } : undefined}
            >
              <div className="font-medium truncate">{s.label}</div>
              <div className="text-[9px] opacity-80 mt-0.5 font-mono">
                {isActive ? "Aktiv" : `${s.probability}%`}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/6 dark:border-white/6">
        <button
          type="button"
          onClick={() => setShowLost((v) => !v)}
          className="text-[11px] text-ink/55 hover:text-[var(--sales-stage-tapt)] transition-colors"
        >
          {currentStage === "Tapt" ? "Markert som tapt" : "Marker som tapt"}
        </button>
        {canConvert && (
          <span className="text-[11px] text-[var(--success)] font-medium">
            Klar til konvertering ↗
          </span>
        )}
      </div>
      {showLost && currentStage !== "Tapt" && (
        <div className="mt-3 pt-3 border-t border-black/6 dark:border-white/6 space-y-2">
          <input
            type="text"
            placeholder="Årsak (valgfri): for dyrt, valgte konkurrent, …"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowLost(false)}
              className="px-3 py-1 rounded-full text-[11px] text-ink/55 hover:text-ink"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStage("Tapt", { lostReason: lostReason || undefined })}
              className="px-3 py-1 rounded-full bg-[var(--sales-stage-tapt)] text-white text-[11px] hover:opacity-90 disabled:opacity-50"
            >
              Bekreft tapt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
