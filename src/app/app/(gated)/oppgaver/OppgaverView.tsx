"use client";

import { useEffect, useState } from "react";
import { SectionLabel, Pill } from "@/components/ui/Pill";
import { IconCheck, IconClose, IconPlus } from "@/components/ui/Icons";
import { PrefetchLink } from "@/components/ui/PrefetchLink";
import { Modal } from "@/components/ui/Modal";
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

type ApplicationOption = {
  id: string;
  companyName: string;
  title: string;
};

const TYPE_LABEL: Record<string, string> = {
  followup: "Oppfølging",
  document: "Dokument",
  research: "Research",
  interview: "Intervju",
  other: "Annet",
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "followup", label: "Oppfølging" },
  { value: "document", label: "Dokument" },
  { value: "research", label: "Research" },
  { value: "interview", label: "Intervju" },
  { value: "other", label: "Annet" },
];

const PRIORITY_LABEL: Record<string, string> = {
  low: "Lav",
  medium: "Medium",
  high: "Høy",
  urgent: "Haster",
};

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "low", label: "Lav" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Høy" },
  { value: "urgent", label: "Haster" },
];

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
  { key: "overdue", label: "Forfalt", hue: "#D5592E" },
  { key: "today", label: "I dag", hue: "#14110e" },
  { key: "week", label: "Denne uken", hue: "#D5592E" },
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

/** type + prioritet slått til én etikett (prioritet vises kun når den ikke er standard). */
function metaPill(task: Task): string | null {
  const typeLabel = task.type ? TYPE_LABEL[task.type] : null;
  const showPrio = task.priority && task.priority !== "medium";
  const prioLabel = showPrio ? PRIORITY_LABEL[task.priority] : null;
  if (typeLabel && prioLabel) return `${typeLabel} · ${prioLabel}`;
  return typeLabel ?? prioLabel;
}

export function OppgaverView({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [creating, setCreating] = useState(false);

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

  function handleCreated(task: Task) {
    setTasks((xs) => [task, ...xs]);
    setCreating(false);
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
          <p className="text-[13px] text-ink/60 max-w-sm mx-auto">
            Legg til oppgaver knyttet til en søknad — forberedelse til intervju,
            oppfølgings-e-post, eller innhenting av referanser.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover"
          >
            <IconPlus size={15} />
            Ny oppgave
          </button>
        </div>
        {creating && (
          <NewTaskModal onClose={() => setCreating(false)} onCreated={handleCreated} />
        )}
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
          <p className="text-[14px] text-ink/60 mt-2">
            {active} aktive
            {overdue > 0 && (
              <span className="text-accent"> · {overdue} forfalt</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 shrink-0 px-4 py-2.5 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover self-start md:self-auto"
        >
          <IconPlus size={15} />
          Ny oppgave
        </button>
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
                <span className="text-[11px] text-ink/40">
                  {items.length}
                </span>
              </div>
              <ul className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
                {items.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {creating && (
        <NewTaskModal onClose={() => setCreating(false)} onCreated={handleCreated} />
      )}
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
  const pill = metaPill(task);
  return (
    <li className="group flex items-start gap-3 p-4">
      <button
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "Marker som ikke fullført" : "Marker som fullført"}
        className={cn(
          "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
          done
            ? "border-ink bg-ink text-bg"
            : "border-black/30 hover:border-ink",
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
          <div className="flex items-baseline gap-2.5">
            <span
              className={cn(
                "text-[15px] font-medium leading-snug shrink-0 tabular-nums",
                overdue ? "text-accent" : done ? "text-ink/40" : "text-ink",
              )}
            >
              {formatDue(task.dueAt)}
            </span>
            <span
              className={cn(
                "text-[14px] font-medium leading-snug min-w-0 truncate",
                done && "line-through text-ink/40",
              )}
            >
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {pill && (
              <Pill variant="muted" className="shrink-0">
                {pill}
              </Pill>
            )}
            <PrefetchLink
              href={`/app/pipeline/${task.application.id}`}
              className="text-[11px] text-ink/50 hover:text-accent truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {task.application.title} · {task.application.companyName}
            </PrefetchLink>
          </div>
        </button>
        {expanded && task.description && (
          <div className="mt-2 text-[12px] text-ink/70 leading-[1.55] whitespace-pre-wrap">
            {task.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(task)}
        className="-m-2.5 p-2.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100 text-ink/40 hover:text-accent transition-opacity"
        aria-label="Slett oppgave"
      >
        <IconClose size={14} />
      </button>
    </li>
  );
}

const FIELD_CLASS =
  "w-full px-3 py-2 rounded-lg bg-bg border border-black/12 dark:border-white/12 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent";

function NewTaskModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("medium");
  const [applicationId, setApplicationId] = useState("");
  const [applications, setApplications] = useState<ApplicationOption[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/applications?sort=updatedAt");
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as ApplicationOption[];
        if (cancelled) return;
        setApplications(data);
        if (data.length) setApplicationId(data[0].id);
      } catch {
        if (!cancelled) setError("Kunne ikke hente søknadene dine.");
      } finally {
        if (!cancelled) setLoadingApps(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !applicationId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          applicationId,
          dueAt: dueAt || null,
          type: type || null,
          priority,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(data?.error ?? "Kunne ikke opprette oppgaven.");
        return;
      }
      const task = (await res.json()) as Task;
      onCreated(task);
    } catch {
      setError("Kunne ikke opprette oppgaven.");
    } finally {
      setSubmitting(false);
    }
  }

  const noApps = !loadingApps && applications.length === 0;

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="Ny oppgave"
      panelClassName="w-full max-w-md"
    >
      <div className="bg-surface rounded-2xl border border-black/5 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/5 dark:border-white/5">
          <h2 className="text-[16px] font-medium">Ny oppgave</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Lukk"
            className="-m-2 p-2 text-ink/40 hover:text-ink transition-colors"
          >
            <IconClose size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label
              htmlFor="task-title"
              className="block text-[12px] font-medium text-ink/70 mb-1.5"
            >
              Tittel
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Send oppfølgings-e-post"
              className={FIELD_CLASS}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-due"
                className="block text-[12px] font-medium text-ink/70 mb-1.5"
              >
                Frist
              </label>
              <input
                id="task-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor="task-type"
                className="block text-[12px] font-medium text-ink/70 mb-1.5"
              >
                Type
              </label>
              <select
                id="task-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={FIELD_CLASS}
              >
                <option value="">Ingen</option>
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="task-priority"
                className="block text-[12px] font-medium text-ink/70 mb-1.5"
              >
                Prioritet
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={FIELD_CLASS}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-application"
                className="block text-[12px] font-medium text-ink/70 mb-1.5"
              >
                Søknad
              </label>
              <select
                id="task-application"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className={FIELD_CLASS}
                disabled={loadingApps || noApps}
                required
              >
                {loadingApps && <option value="">Laster…</option>}
                {noApps && <option value="">Ingen søknader</option>}
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} · {a.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {noApps && (
            <p className="text-[12px] text-ink/60">
              Oppgaver knyttes til en søknad. Opprett en søknad i pipeline
              først.
            </p>
          )}

          {error && (
            <p className="text-[12px] text-accent" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[13px] text-ink/70 hover:bg-panel transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !applicationId}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IconPlus size={15} />
              {submitting ? "Oppretter…" : "Opprett"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
