"use client";

import { useState } from "react";
import { Target, Pencil, Check, X } from "lucide-react";

export function GoalWidget({
  thisWeekSent,
  initialGoal,
}: {
  thisWeekSent: number;
  initialGoal: number | null;
}) {
  const [goal, setGoal] = useState<number | null>(initialGoal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialGoal ?? 5));
  const [saving, setSaving] = useState(false);

  const pct = goal ? Math.min(Math.round((thisWeekSent / goal) * 100), 100) : 0;
  const done = goal !== null && thisWeekSent >= goal;

  async function save() {
    const n = parseInt(draft, 10);
    if (!n || n < 1) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklyGoal: n }),
      });
      if (res.ok) {
        setGoal(n);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!goal && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-2 min-h-[44px] md:min-h-0 px-4 py-2.5 md:py-2 rounded-full bg-accent/10 text-accent border border-accent/25 hover:bg-accent/15 hover:border-accent/40 transition-colors text-[13px] font-medium"
      >
        <Target className="size-4" />
        Sett ukesmål
      </button>
    );
  }

  if (editing) {
    return (
      <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-2.5 sm:pl-4 rounded-2xl sm:rounded-full bg-surface border border-black/10 dark:border-white/10 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <Target className="size-4 text-accent shrink-0" />
          <label
            htmlFor="goal-input"
            className="text-[13px] text-ink/70 whitespace-nowrap"
          >
            Mål per uke
          </label>
          <input
            id="goal-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-16 h-9 px-2 rounded-lg border border-black/15 dark:border-white/15 text-[14px] text-center font-medium focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 bg-bg"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-1">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] disabled:opacity-50 transition-colors"
          >
            <Check className="size-3.5" />
            {saving ? "Lagrer…" : "Lagre"}
          </button>
          <button
            onClick={() => setEditing(false)}
            aria-label="Avbryt"
            className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-3 rounded-full text-ink/55 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 text-[12px] transition-colors"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 pl-3 pr-1.5 py-1.5 rounded-full bg-surface border border-black/8 dark:border-white/8 max-w-full">
      <Target
        className={`size-4 shrink-0 ${done ? "text-[#16a34a]" : "text-accent"}`}
      />
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-20 sm:w-28 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full transition-all ${done ? "bg-[#16a34a]" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[12px] font-medium text-ink/75 whitespace-nowrap">
          <span className="text-ink">{thisWeekSent}</span>
          <span className="text-ink/45">/{goal}</span>
          <span className="hidden sm:inline ml-1 text-ink/55 font-normal">denne uken</span>
          {done && (
            <Check className="inline size-3.5 ml-1 text-[#16a34a] -translate-y-px" />
          )}
        </span>
      </div>
      <button
        onClick={() => {
          setDraft(String(goal));
          setEditing(true);
        }}
        aria-label="Endre ukesmål"
        className="inline-flex items-center justify-center size-9 rounded-full text-ink/45 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
      >
        <Pencil className="size-3.5" />
      </button>
    </div>
  );
}
