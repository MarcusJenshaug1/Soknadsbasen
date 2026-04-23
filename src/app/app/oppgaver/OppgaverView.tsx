"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/Pill";
import { StatusDot, type StatusKey } from "@/components/ui/StatusDot";
import { IconCheck, IconClose } from "@/components/ui/Icons";
import { cn } from "@/lib/cn";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  priority: string;
  type: string | null;
  application: {
    id: string;
    companyName: string;
    title: string;
    status: string;
  };
};

const TYPE_LABEL: Record<string, string> = {
  followup: "Oppfølging",
  document: "Dokument",
  research: "Research",
  interview: "Intervju",
  other: "Annet",
};

const PRIORITY: Record<string, { label: string; color: string }> = {
  low: { label: "Lav", color: "#94a3b8" },
  medium: { label: "Medium", color: "#14110e" },
  high: { label: "Høy", color: "#c15a3a" },
  urgent: { label: "Haster", color: "#c15a3a" },
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function bucketFor(t: Task): "overdue" | "today" | "week" | "later" | "done" {
  if (t.completedAt) return "done";
  if (!t.dueAt) return "later";
  const due = new Date(t.dueAt).getTime();
  const today = startOfDay();
  const tomorrow = today + 86_400_000;
  const weekEnd = today + 7 * 86_400_000;
  if (due < today) return "overdue";
  if (due < tomorrow) return "today";
  if (due < weekEnd) return "week";
  return "later";
}

const BUCKETS: { key: ReturnType<typeof bucketFor>; label: string; hue: string }[] = [
  { key: "overdue", label: "Forfalt", hue: "#c15a3a" },
  { key: "today", label: "I dag", hue: "#14110e" },
  { key: "week", label: "Denne uken", hue: "#c15a3a" },
  { key: "later", label: "Senere", hue: "#94a3b8" },
  { key: "done", label: "Fullført", hue: "#16a34a" },
];

function formatDue(s: string | null) {
  if (!s) return "Ingen frist";
  const d = new Date(s);
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

export function OppgaverView({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);

  async function toggle(task: Task) {
    const completed = !task.completedAt;
    const prev = tasks;
    setTasks((xs) =>
      xs.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: completed ? new Date().toISOString() : null }
          : t,
      ),
    );
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedAt: completed ? new Date().toISOString() : null,
      }),
    });
    if (!res.ok) setTasks(prev);
  }

  async function remove(task: Task) {
    const prev = tasks;
    setTasks((xs) => xs.filter((t) => t.id !== task.id));
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) setTasks(prev);
  }

  const grouped = new Map<ReturnType<typeof bucketFor>, Task[]>();
  for (const b of BUCKETS) grouped.set(b.key, []);
  for (const t of tasks) grouped.get(bucketFor(t))!.push(t);

  const active = tasks.filter((t) => !t.completedAt).length;
  const overdue = grouped.get("overdue")!.length;

  if (tasks.length === 0) {
    return (
      <div className="max-w-[900px] mx-auto px-5 md:px-10 py-6 md:py-10">
        <SectionLabel className="mb-3">Oppgaver</SectionLabel>
        <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-10">
          Oppgaver og frister
        </h1>
        <div className="text-center py-16">
          <div className="text-[18px] font-medium mb-2">Ingen oppgaver ennå.</div>
          <p className="text-[13px] text-[#14110e]/60 max-w-sm mx-auto">
            Legg til oppgaver fra en søknad — forberedelse til intervju,
            oppfølgings-e-post, eller innhenting av referanser.
          </p>
          <Link
            href="/app/pipeline"
            className="inline-flex mt-6 px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a]"
          >
            Åpne pipeline
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-5 md:px-10 py-6 md:py-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8">
        <div>
          <SectionLabel className="mb-3">Oppgaver</SectionLabel>
          <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
            Oppgaver og frister
          </h1>
          <p className="text-[14px] text-[#14110e]/60 mt-2">
            {active} aktive
            {overdue > 0 && (
              <span className="text-[#c15a3a]"> · {overdue} forfalt</span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {BUCKETS.map((b) => {
          const items = grouped.get(b.key) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={b.key}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: b.hue }}
                />
                <SectionLabel>{b.label}</SectionLabel>
                <span className="text-[11px] text-[#14110e]/40">
                  {items.length}
                </span>
              </div>
              <ul className="bg-white rounded-2xl border border-black/5 divide-y divide-black/5 overflow-hidden">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onRemove: (t: Task) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = !!task.completedAt;
  const overdue =
    task.dueAt && !done && new Date(task.dueAt).getTime() < Date.now();
  const prio = task.priority ? PRIORITY[task.priority] : null;
  const typeLabel = task.type ? TYPE_LABEL[task.type] : null;
  return (
    <li className="group flex items-start gap-3 p-4">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "Marker som ikke fullført" : "Marker som fullført"}
        className={cn(
          "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
          done
            ? "border-[#14110e] bg-[#14110e] text-[#faf8f5]"
            : "border-black/30 hover:border-[#14110e]",
        )}
      >
        {done && <IconCheck size={10} />}
      </button>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => task.description && setExpanded((v) => !v)}
          className="block text-left w-full"
        >
          <div
            className={cn(
              "text-[14px] font-medium leading-tight",
              done && "line-through text-[#14110e]/40",
            )}
          >
            {task.title}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <Link
              href={`/app/pipeline/${task.application.id}`}
              className="text-[11px] text-[#c15a3a] hover:text-[#14110e] truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {task.application.title} · {task.application.companyName}
            </Link>
            <StatusDot status={task.application.status as StatusKey} />
            {prio && task.priority !== "medium" && (
              <span
                className="text-[10px] uppercase tracking-[0.12em] inline-flex items-center gap-1"
                style={{ color: prio.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: prio.color }}
                />
                {prio.label}
              </span>
            )}
            {typeLabel && (
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#14110e]/55">
                {typeLabel}
              </span>
            )}
            <span
              className={cn(
                "text-[11px]",
                overdue ? "text-[#c15a3a]" : "text-[#14110e]/50",
              )}
            >
              {formatDue(task.dueAt)}
            </span>
          </div>
        </button>
        {expanded && task.description && (
          <div className="mt-2 text-[12px] text-[#14110e]/70 leading-[1.55] whitespace-pre-wrap">
            {task.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(task)}
        className="opacity-0 group-hover:opacity-100 text-[#14110e]/40 hover:text-[#c15a3a] transition-opacity"
        aria-label="Slett oppgave"
      >
        <IconClose size={14} />
      </button>
    </li>
  );
}
