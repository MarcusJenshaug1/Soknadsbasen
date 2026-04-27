"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { relativeNb } from "@/lib/sales/format";

type ActivityType = "note" | "task" | "call" | "meeting" | "email";

type Activity = {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  dueAt: string | null;
  completedAt: string | null;
  durationMin: number | null;
  createdAt: string;
  createdBy: { name: string | null; email: string };
};

const TYPE_LABEL: Record<string, string> = {
  note: "Notat",
  task: "Oppgave",
  call: "Telefon",
  meeting: "Møte",
  email: "E-post",
};

const TYPE_COLOR: Record<string, string> = {
  note: "bg-black/[0.06] dark:bg-white/[0.08] text-ink/70",
  task: "bg-[var(--sales-commission-eligible)]/15 text-[var(--sales-commission-eligible)]",
  call: "bg-[var(--success)]/15 text-[var(--success)]",
  meeting: "bg-[var(--sales-stage-kontaktet)]/15 text-[var(--sales-stage-kontaktet)]",
  email: "bg-[var(--sales-stage-demo)]/15 text-[var(--sales-stage-demo)]",
};

const TABS: { id: ActivityType; label: string }[] = [
  { id: "note", label: "Notat" },
  { id: "task", label: "Oppgave" },
  { id: "call", label: "Telefon" },
  { id: "meeting", label: "Møte" },
  { id: "email", label: "E-post" },
];

export function LeadActivities({
  leadId,
  initial,
}: {
  leadId: string;
  initial: Activity[];
}) {
  const [activities, setActivities] = useState(initial);
  const [type, setType] = useState<ActivityType>("note");
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [duration, setDuration] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function reset() {
    setContent("");
    setTitle("");
    setDueAt("");
    setDuration("");
  }

  function submit() {
    if (!content.trim() && !title.trim()) return;
    startTransition(async () => {
      const body = {
        type,
        title: title.trim() || null,
        content: content.trim() || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        durationMin: duration ? Number(duration) : null,
      };
      const res = await fetch(`/api/sales/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("Klarte ikke lagre aktivitet.");
        return;
      }
      const j = await res.json();
      const a = j.activity as Activity & { dueAt: string | null; createdAt: string; completedAt: string | null };
      setActivities((prev) => [
        {
          id: a.id,
          type: a.type,
          title: a.title,
          content: a.content,
          dueAt: a.dueAt,
          completedAt: a.completedAt,
          durationMin: a.durationMin,
          createdAt: a.createdAt,
          createdBy: a.createdBy,
        },
        ...prev,
      ]);
      reset();
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
      <h2 className="text-[13px] font-medium mb-3">Aktivitet</h2>

      <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-3 space-y-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={
                "px-3 py-1 rounded-full text-[11px] transition-colors shrink-0 " +
                (type === t.id
                  ? "bg-ink text-bg"
                  : "text-ink/55 hover:text-ink")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        {(type === "task" || type === "meeting") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={type === "task" ? "Oppgave-tittel" : "Møte-tittel"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            />
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
            />
          </div>
        )}
        {type === "call" && (
          <input
            type="number"
            min={0}
            placeholder="Varighet (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full sm:w-32 px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
          />
        )}
        {type === "email" && (
          <input
            type="text"
            placeholder="Emne (valgfri)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60"
          />
        )}
        <textarea
          rows={3}
          placeholder={
            type === "note"
              ? "Skriv et notat…"
              : type === "task"
                ? "Beskrivelse (valgfri)…"
                : type === "call"
                  ? "Hva ble diskutert?"
                  : type === "meeting"
                    ? "Agenda / referat…"
                    : "Lim inn e-post-innhold…"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-black/10 dark:border-white/10 bg-bg text-[12px] outline-none focus:border-[var(--accent)]/60 resize-y"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={pending || (!content.trim() && !title.trim())}
            className="px-3 py-1.5 rounded-full bg-ink text-bg text-[12px] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {activities.length === 0 && (
          <li className="text-[12px] text-ink/55 text-center py-6">
            Ingen aktiviteter ennå. Logg notater, oppgaver eller møter for å holde oversikt.
          </li>
        )}
        {activities.map((a) => (
          <li key={a.id} className="flex gap-3 pb-3 border-b border-black/6 dark:border-white/6 last:border-0">
            <span
              className={
                "w-6 h-6 rounded-full text-[10px] font-mono font-semibold flex items-center justify-center shrink-0 " +
                (TYPE_COLOR[a.type] ?? TYPE_COLOR.note)
              }
              aria-hidden
            >
              {(TYPE_LABEL[a.type] ?? a.type).slice(0, 1)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <span className="text-[12px] font-medium">
                  {TYPE_LABEL[a.type] ?? a.type}
                  {a.title && <span className="text-ink/65 font-normal"> · {a.title}</span>}
                </span>
                <span className="text-[10px] text-ink/45 font-mono shrink-0">
                  {relativeNb(a.createdAt)}
                </span>
              </div>
              {a.content && (
                <p className="text-[12px] text-ink/70 mt-1 whitespace-pre-wrap leading-relaxed">{a.content}</p>
              )}
              {(a.dueAt || a.durationMin) && (
                <div className="text-[10px] text-ink/55 mt-1 font-mono">
                  {a.dueAt && <span>Forfall: {new Date(a.dueAt).toLocaleString("nb-NO", { dateStyle: "medium", timeStyle: "short" })}</span>}
                  {a.durationMin && <span>{a.dueAt ? " · " : ""}{a.durationMin} min</span>}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
