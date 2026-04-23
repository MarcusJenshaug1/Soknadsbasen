"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionLabel, Pill } from "@/components/ui/Pill";
import { StatusDot, STATUS_LABEL, type StatusKey } from "@/components/ui/StatusDot";
import { IconPlus, IconCheck, IconClose, IconArrowRight } from "@/components/ui/Icons";
import { PIPELINE_COLUMNS } from "@/lib/pipeline";
import { cn } from "@/lib/cn";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  priority: string;
  type: string | null;
  createdAt: string;
};

type Activity = {
  id: string;
  type: string;
  note: string | null;
  occurredAt: string;
};

type Application = {
  id: string;
  companyName: string;
  title: string;
  source: string | null;
  jobUrl: string | null;
  status: string;
  statusNote: string | null;
  applicationDate: string | null;
  deadlineAt: string | null;
  interviewAt: string | null;
  followUpAt: string | null;
  offerSalary: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  jobDescription: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
  activities: Activity[];
};

function toDateInput(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function fromDateInput(s: string): string | null {
  if (!s) return null;
  return new Date(s + "T12:00:00Z").toISOString();
}

function formatDate(s: string | null, withTime = false): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const SOURCES = ["LinkedIn", "FINN.no", "Webcruiter", "Direkte kontakt", "Referanse", "Annet"];

export function ApplicationDetail({ initial }: { initial: Application }) {
  const router = useRouter();
  const [app, setApp] = useState(initial);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  async function patch(
    field: string,
    patch: Record<string, unknown>,
  ) {
    setSavingField(field);
    setError(null);
    const prev = app;
    setApp((a) => ({ ...a, ...patch }));
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kunne ikke lagre");
      }
      const updated = await res.json();
      setApp((a) => ({ ...a, ...updated }));
      setLastSavedAt(new Date());
    } catch (err) {
      setApp(prev);
      setError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setSavingField(null);
    }
  }

  async function deleteApp() {
    if (!confirm("Slette denne søknaden? Kan ikke angres.")) return;
    const res = await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
    if (res.ok) router.push("/app/pipeline");
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    const body = {
      title: newTask.trim(),
      dueAt: newTaskDue ? fromDateInput(newTaskDue) : null,
    };
    const res = await fetch(`/api/applications/${app.id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const task = await res.json();
      setApp((a) => ({ ...a, tasks: [task, ...a.tasks] }));
      setNewTask("");
      setNewTaskDue("");
    }
  }

  async function toggleTask(task: Task) {
    const completed = !task.completedAt;
    const prev = app.tasks;
    setApp((a) => ({
      ...a,
      tasks: a.tasks.map((t) =>
        t.id === task.id
          ? { ...t, completedAt: completed ? new Date().toISOString() : null }
          : t,
      ),
    }));
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completedAt: completed ? new Date().toISOString() : null,
      }),
    });
    if (!res.ok) setApp((a) => ({ ...a, tasks: prev }));
  }

  async function deleteTask(task: Task) {
    const prev = app.tasks;
    setApp((a) => ({ ...a, tasks: a.tasks.filter((t) => t.id !== task.id) }));
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) setApp((a) => ({ ...a, tasks: prev }));
  }

  const saved = savingField
    ? "Lagrer…"
    : lastSavedAt
      ? `Lagret ${Math.max(1, Math.round((Date.now() - lastSavedAt.getTime()) / 1000))}s siden`
      : "Endringer lagres automatisk";

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-10 py-6 md:py-10 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-[#14110e]/55">
        <Link href="/app/pipeline" className="hover:text-[#c15a3a]">
          Pipeline
        </Link>
        <span>/</span>
        <span className="text-[#14110e]/70 truncate">{app.companyName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-[#eee9df] text-[14px] font-medium flex items-center justify-center text-[#14110e]/70 shrink-0">
            {initials(app.companyName)}
          </div>
          <div className="min-w-0">
            <InlineTitle
              value={app.title}
              onCommit={(v) => patch("title", { title: v })}
            />
            <InlineCompany
              value={app.companyName}
              onCommit={(v) => patch("companyName", { companyName: v })}
            />
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <StatusDot status={app.status as StatusKey} />
              <span className="text-[11px] text-[#14110e]/45">
                Opprettet {formatDate(app.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[#14110e]/45">{saved}</span>
          <button
            onClick={deleteApp}
            className="px-4 py-2 rounded-full border border-[#c15a3a]/30 text-[12px] text-[#c15a3a] hover:bg-[#c15a3a]/5"
          >
            Slett
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-2xl bg-[#c15a3a]/10 border border-[#c15a3a]/30 text-[12px] text-[#c15a3a]">
          {error}
        </div>
      )}

      {/* Status selector */}
      <Card>
        <SectionLabel className="mb-4">Status</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {PIPELINE_COLUMNS.map((col) => {
            const active = app.status === col.status;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => patch("status", { status: col.status })}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] transition-colors",
                  active
                    ? "bg-[#14110e] text-[#faf8f5]"
                    : "bg-[#eee9df] text-[#14110e]/70 hover:text-[#14110e]",
                )}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: col.dotColor }}
                />
                {col.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: details + notes */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <SectionLabel className="mb-4">Stilling</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Kilde"
                value={app.source ?? ""}
                list={SOURCES}
                onCommit={(v) => patch("source", { source: v || null })}
              />
              <TextField
                label="Stillings-URL"
                value={app.jobUrl ?? ""}
                placeholder="https://…"
                onCommit={(v) => patch("jobUrl", { jobUrl: v || null })}
              />
              <DateField
                label="Søknadsdato"
                value={app.applicationDate}
                onCommit={(v) => patch("applicationDate", { applicationDate: v })}
              />
              <DateField
                label="Søknadsfrist"
                value={app.deadlineAt}
                onCommit={(v) => patch("deadlineAt", { deadlineAt: v })}
              />
              <DateField
                label="Intervju-dato"
                value={app.interviewAt}
                onCommit={(v) => patch("interviewAt", { interviewAt: v })}
              />
              <DateField
                label="Oppfølging"
                value={app.followUpAt}
                onCommit={(v) => patch("followUpAt", { followUpAt: v })}
              />
              <TextField
                label="Tilbudslønn"
                value={app.offerSalary ?? ""}
                placeholder="f.eks. 780 000 NOK"
                onCommit={(v) => patch("offerSalary", { offerSalary: v || null })}
              />
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-4">Kontakt</SectionLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Navn"
                value={app.contactName ?? ""}
                onCommit={(v) => patch("contactName", { contactName: v || null })}
              />
              <TextField
                label="E-post"
                type="email"
                value={app.contactEmail ?? ""}
                onCommit={(v) => patch("contactEmail", { contactEmail: v || null })}
              />
              <TextField
                label="Telefon"
                value={app.contactPhone ?? ""}
                onCommit={(v) => patch("contactPhone", { contactPhone: v || null })}
              />
            </div>
          </Card>

          <Card>
            <SectionLabel className="mb-4">Jobbeskrivelse</SectionLabel>
            <Textarea
              value={app.jobDescription ?? ""}
              placeholder="Lim inn stillingsteksten her."
              rows={6}
              onCommit={(v) =>
                patch("jobDescription", { jobDescription: v || null })
              }
            />
          </Card>

          <Card>
            <SectionLabel className="mb-4">Notater</SectionLabel>
            <Textarea
              value={app.notes ?? ""}
              placeholder="Egne refleksjoner, intervjuforberedelse, research …"
              rows={6}
              onCommit={(v) => patch("notes", { notes: v || null })}
            />
          </Card>
        </div>

        {/* Right: tasks + activity */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Oppgaver</SectionLabel>
              <span className="text-[11px] text-[#14110e]/45">
                {app.tasks.filter((t) => !t.completedAt).length} aktive
              </span>
            </div>
            <form onSubmit={addTask} className="mb-4 space-y-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Ny oppgave…"
                className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#c15a3a]"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="flex-1 bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a] text-[#14110e]/70"
                />
                <button
                  type="submit"
                  disabled={!newTask.trim()}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] disabled:opacity-40"
                >
                  <IconPlus size={12} />
                  Legg til
                </button>
              </div>
            </form>
            <ul className="space-y-1">
              {app.tasks.map((t) => {
                const done = !!t.completedAt;
                const overdue =
                  t.dueAt && !done && new Date(t.dueAt).getTime() < Date.now();
                return (
                  <li
                    key={t.id}
                    className="group flex items-start gap-3 py-2 border-b border-black/5 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask(t)}
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
                      <div
                        className={cn(
                          "text-[13px]",
                          done && "line-through text-[#14110e]/40",
                        )}
                      >
                        {t.title}
                      </div>
                      {t.dueAt && (
                        <div
                          className={cn(
                            "text-[11px] mt-0.5",
                            overdue ? "text-[#c15a3a]" : "text-[#14110e]/50",
                          )}
                        >
                          Frist {formatDate(t.dueAt)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTask(t)}
                      className="opacity-0 group-hover:opacity-100 text-[#14110e]/40 hover:text-[#c15a3a] transition-opacity"
                      aria-label="Slett oppgave"
                    >
                      <IconClose size={14} />
                    </button>
                  </li>
                );
              })}
              {app.tasks.length === 0 && (
                <li className="py-6 text-center text-[12px] text-[#14110e]/40">
                  Ingen oppgaver ennå.
                </li>
              )}
            </ul>
          </Card>

          <Card>
            <SectionLabel className="mb-4">Tidslinje</SectionLabel>
            <ul className="space-y-3">
              {app.activities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c15a3a] mt-[7px] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[12px] text-[#14110e]/80">
                      {a.note ?? STATUS_LABEL[a.type as StatusKey] ?? a.type}
                    </div>
                    <div className="text-[11px] text-[#14110e]/45">
                      {formatDate(a.occurredAt, true)}
                    </div>
                  </div>
                </li>
              ))}
              {app.activities.length === 0 && (
                <li className="text-[12px] text-[#14110e]/40 text-center py-4">
                  Ingen hendelser ennå.
                </li>
              )}
            </ul>
          </Card>

          <Card>
            <SectionLabel className="mb-4">Søknadsbrev</SectionLabel>
            <Link
              href={`/app/brev/${app.id}`}
              className="inline-flex items-center gap-1.5 text-[13px] text-[#c15a3a] hover:text-[#14110e]"
            >
              Åpne brev-editor
              <IconArrowRight size={14} />
            </Link>
          </Card>
        </div>
      </div>

      {app.statusNote && <Pill variant="muted">{app.statusNote}</Pill>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 md:p-6">
      {children}
    </div>
  );
}

function InlineTitle({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className="text-[24px] md:text-[32px] leading-[1.1] tracking-[-0.02em] font-medium bg-transparent outline-none w-full hover:bg-[#eee9df]/40 focus:bg-[#eee9df]/60 rounded-lg px-1 -mx-1"
    />
  );
}

function InlineCompany({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className="text-[14px] text-[#14110e]/60 mt-1 bg-transparent outline-none w-full hover:bg-[#eee9df]/40 focus:bg-[#eee9df]/60 rounded-lg px-1 -mx-1"
    />
  );
}

function TextField({
  label,
  value,
  onCommit,
  type = "text",
  placeholder,
  list,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  type?: string;
  placeholder?: string;
  list?: string[];
}) {
  const [v, setV] = useState(value);
  const listId = list ? `dl-${label.replace(/\s/g, "-")}` : undefined;
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={v}
        placeholder={placeholder}
        list={listId}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onCommit(v)}
        className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#c15a3a]"
      />
      {list && (
        <datalist id={listId}>
          {list.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string | null;
  onCommit: (v: string | null) => void;
}) {
  const [v, setV] = useState(toDateInput(value));
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
        {label}
      </label>
      <input
        type="date"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const iso = fromDateInput(v);
          if (iso !== value) onCommit(iso);
        }}
        className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#c15a3a]"
      />
    </div>
  );
}

function Textarea({
  value,
  onCommit,
  rows = 4,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <textarea
      value={v}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onCommit(v)}
      className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#c15a3a] resize-y"
    />
  );
}
