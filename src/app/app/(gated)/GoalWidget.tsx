"use client";

import { useState } from "react";

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
        className="text-[12px] text-[#14110e]/45 dark:text-[#f0ece6]/45 hover:text-accent transition-colors"
      >
        + Sett ukesmål
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60">Mål:</span>
        <input
          type="number"
          min={1}
          max={100}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-14 px-2 py-1 rounded-lg border border-black/20 dark:border-white/20 text-[12px] text-center focus:outline-none focus:border-accent bg-bg"
          autoFocus
        />
        <span className="text-[12px] text-[#14110e]/60 dark:text-[#f0ece6]/60">søknader/uke</span>
        <button
          onClick={save}
          disabled={saving}
          className="text-[11px] text-accent hover:text-[var(--accent-hover)] disabled:opacity-50"
        >
          {saving ? "…" : "Lagre"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-[11px] text-[#14110e]/45 dark:text-[#f0ece6]/45 hover:text-ink"
        >
          Avbryt
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-28 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${done ? "bg-[#16a34a]" : "bg-accent"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70 whitespace-nowrap">
          {thisWeekSent}/{goal} denne uken
          {done && <span className="ml-1 text-[#16a34a]">✓</span>}
        </span>
      </div>
      <button
        onClick={() => {
          setDraft(String(goal));
          setEditing(true);
        }}
        className="text-[11px] text-[#14110e]/35 dark:text-[#f0ece6]/35 hover:text-[#14110e]/60 dark:hover:text-[#f0ece6]/60 transition-colors"
      >
        Endre
      </button>
    </div>
  );
}
