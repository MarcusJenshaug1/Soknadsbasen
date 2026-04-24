"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

export type Stage = {
  id: string;
  round: number;
  type: string;
  scheduledAt: string | null;
  outcome: string;
  notes: string | null;
};

const TYPES: { id: string; label: string }[] = [
  { id: "phone", label: "Telefonsamtale" },
  { id: "technical", label: "Teknisk intervju" },
  { id: "hr", label: "HR-samtale" },
  { id: "final", label: "Finalerunde" },
  { id: "other", label: "Annet" },
];

const OUTCOMES: { id: string; label: string; color: string }[] = [
  { id: "pending", label: "Venter", color: "#94a3b8" },
  { id: "passed", label: "Gikk videre", color: "#16a34a" },
  { id: "failed", label: "Ikke videre", color: "#D5592E" },
  { id: "cancelled", label: "Avlyst", color: "#d1d5db" },
];

function outcomeStyle(o: string) {
  return OUTCOMES.find((x) => x.id === o) ?? OUTCOMES[0];
}

function typeLabel(t: string) {
  return TYPES.find((x) => x.id === t)?.label ?? t;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nb-NO", {
    weekday: "short", day: "numeric", month: "short",
  });
}

export function InterviewStages({
  applicationId,
  initial,
}: {
  applicationId: string;
  initial: Stage[];
}) {
  const [stages, setStages] = useState<Stage[]>(initial);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState("phone");
  const [newDate, setNewDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  async function addStage() {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/stages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: newType, scheduledAt: newDate || null }),
      });
      if (res.ok) {
        const stage = await res.json() as Stage;
        setStages((prev) => [...prev, stage]);
        setAdding(false);
        setNewType("phone");
        setNewDate("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateOutcome(stageId: string, outcome: string) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, outcome } : s));
    await fetch(`/api/applications/${applicationId}/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome }),
    });
  }

  async function saveNotes(stageId: string) {
    setStages((prev) => prev.map((s) => s.id === stageId ? { ...s, notes: notesDraft || null } : s));
    setEditingNotes(null);
    await fetch(`/api/applications/${applicationId}/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesDraft || null }),
    });
  }

  async function deleteStage(stageId: string) {
    setStages((prev) => prev.filter((s) => s.id !== stageId));
    await fetch(`/api/applications/${applicationId}/stages/${stageId}`, { method: "DELETE" });
  }

  return (
    <div className="bg-surface rounded-3xl p-6 border border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-5">
        <SectionLabel>Intervjurunder</SectionLabel>
        <button
          onClick={() => setAdding(true)}
          className="text-[11px] text-accent hover:text-[var(--accent-hover)] transition-colors"
        >
          + Legg til runde
        </button>
      </div>

      {stages.length === 0 && !adding && (
        <p className="text-[13px] text-[#14110e]/45 dark:text-[#f0ece6]/45">
          Ingen intervjurunder lagt til ennå.
        </p>
      )}

      {/* Timeline */}
      {stages.length > 0 && (
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const outcome = outcomeStyle(stage.outcome);
            return (
              <div key={stage.id} className="flex gap-3">
                {/* Connector */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                    style={{ background: outcome.color }}
                  />
                  {i < stages.length - 1 && (
                    <div className="w-px flex-1 bg-black/10 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <span className="text-[13px] font-medium">
                        Runde {stage.round} — {typeLabel(stage.type)}
                      </span>
                      {stage.scheduledAt && (
                        <span className="ml-2 text-[11px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
                          {formatDate(stage.scheduledAt)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteStage(stage.id)}
                      className="text-[10px] text-[#14110e]/25 dark:text-[#f0ece6]/25 hover:text-accent transition-colors shrink-0"
                    >
                      Fjern
                    </button>
                  </div>

                  {/* Outcome buttons */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {OUTCOMES.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => updateOutcome(stage.id, o.id)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] transition-colors border",
                          stage.outcome === o.id
                            ? "border-transparent text-white"
                            : "border-black/10 dark:border-white/10 text-[#14110e]/55 dark:text-[#f0ece6]/55 hover:border-black/20 dark:hover:border-white/20",
                        )}
                        style={stage.outcome === o.id ? { background: o.color } : undefined}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {/* Notes */}
                  {editingNotes === stage.id ? (
                    <div className="mt-2">
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[12px] resize-none focus:outline-none focus:border-accent bg-bg"
                        placeholder="Notater fra runden …"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => saveNotes(stage.id)}
                          className="text-[11px] text-accent hover:text-[var(--accent-hover)]"
                        >
                          Lagre
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNotes(stage.id); setNotesDraft(stage.notes ?? ""); }}
                      className="mt-1.5 text-[11px] text-left text-[#14110e]/45 dark:text-[#f0ece6]/45 hover:text-ink transition-colors"
                    >
                      {stage.notes ? stage.notes : "+ Legg til notater"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add stage form */}
      {adding && (
        <div className="mt-3 p-4 rounded-2xl bg-bg border border-black/8 dark:border-white/8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 dark:text-[#f0ece6]/55 block mb-1">
                Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[13px] bg-surface focus:outline-none focus:border-accent"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 dark:text-[#f0ece6]/55 block mb-1">
                Dato (valgfri)
              </label>
              <input
                type="datetime-local"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 text-[13px] focus:outline-none focus:border-accent bg-bg"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addStage}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-ink text-bg text-[12px] font-medium hover:bg-[#2a2522] dark:hover:bg-[#3a332d] disabled:opacity-50"
            >
              {saving ? "Lagrer …" : "Legg til"}
            </button>
            <button
              onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-[12px] hover:bg-black/5 dark:hover:bg-white/5"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
