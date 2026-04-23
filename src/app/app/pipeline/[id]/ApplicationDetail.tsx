"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SectionLabel, Pill } from "@/components/ui/Pill";
import { StatusDot, STATUS_LABEL, type StatusKey } from "@/components/ui/StatusDot";
import { IconPlus, IconCheck, IconClose, IconArrowRight } from "@/components/ui/Icons";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { PIPELINE_COLUMNS } from "@/lib/pipeline";
import { cn } from "@/lib/cn";
import { AiTools } from "./AiTools";

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

const TASK_TYPES: { id: string; label: string }[] = [
  { id: "followup", label: "Oppfølging" },
  { id: "document", label: "Dokument" },
  { id: "research", label: "Research" },
  { id: "interview", label: "Intervju" },
  { id: "other", label: "Annet" },
];

const TASK_PRIORITIES: { id: string; label: string; color: string }[] = [
  { id: "low", label: "Lav", color: "#94a3b8" },
  { id: "medium", label: "Medium", color: "#14110e" },
  { id: "high", label: "Høy", color: "#c15a3a" },
  { id: "urgent", label: "Haster", color: "#c15a3a" },
];

const CHANNELS: { id: string; label: string }[] = [
  { id: "email", label: "E-post" },
  { id: "sms", label: "Telefon (melding)" },
  { id: "call", label: "Telefon (samtale)" },
  { id: "meeting", label: "Møte" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "other", label: "Annet" },
];

function channelLabel(id: string | null): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? id ?? "";
}

type Activity = {
  id: string;
  type: string;
  note: string | null;
  direction: string | null;
  channel: string | null;
  occurredAt: string;
};

type Application = {
  id: string;
  companyName: string;
  companyWebsite: string | null;
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
  coverLetter: { id: string; updatedAt: string; body: string | null } | null;
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
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskType, setNewTaskType] = useState("followup");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskExpanded, setNewTaskExpanded] = useState(false);

  const [commDir, setCommDir] = useState<"outbound" | "inbound">("outbound");
  const [commChannel, setCommChannel] = useState("email");
  const [commNote, setCommNote] = useState("");
  const [commDate, setCommDate] = useState(
    new Date().toISOString().slice(0, 16),
  );

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
      description: newTaskDesc.trim() || null,
      dueAt: newTaskDue ? fromDateInput(newTaskDue) : null,
      type: newTaskType,
      priority: newTaskPriority,
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
      setNewTaskDesc("");
      setNewTaskType("followup");
      setNewTaskPriority("medium");
      setNewTaskExpanded(false);
    }
  }

  async function logCommunication(e: React.FormEvent) {
    e.preventDefault();
    if (!commNote.trim()) return;
    const body = {
      type: "communication",
      direction: commDir,
      channel: commChannel,
      note: commNote.trim(),
      occurredAt: commDate ? new Date(commDate).toISOString() : undefined,
    };
    const res = await fetch(`/api/applications/${app.id}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const activity = await res.json();
      setApp((a) => ({ ...a, activities: [activity, ...a.activities] }));
      setCommNote("");
      setCommDate(new Date().toISOString().slice(0, 16));
    }
  }

  async function deleteActivity(activityId: string) {
    const prev = app.activities;
    setApp((a) => ({
      ...a,
      activities: a.activities.filter((x) => x.id !== activityId),
    }));
    const res = await fetch(
      `/api/applications/${app.id}/activity?eventId=${activityId}`,
      { method: "DELETE" },
    );
    if (!res.ok) setApp((a) => ({ ...a, activities: prev }));
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
          <CompanyLogo
            website={app.companyWebsite}
            name={app.companyName}
            size="lg"
          />
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
        {(app.status === "declined" ||
          app.status === "rejected" ||
          app.status === "withdrawn") && (
          <div className="mt-4">
            <label className="text-[11px] uppercase tracking-wider text-[#14110e]/55 block mb-2">
              {app.status === "declined"
                ? "Begrunnelse for å takke nei"
                : app.status === "rejected"
                  ? "Begrunnelse fra arbeidsgiver"
                  : "Hvorfor trukket"}
            </label>
            <Textarea
              value={app.statusNote ?? ""}
              placeholder={
                app.status === "declined"
                  ? "Lønn, rolle, reisevei, annet tilbud …"
                  : "Kort notat til eget bruk"
              }
              rows={3}
              onCommit={(v) => patch("statusNote", { statusNote: v })}
            />
          </div>
        )}
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
              <TextField
                label="Selskapets nettside"
                value={app.companyWebsite ?? ""}
                placeholder="schibsted.no"
                onCommit={(v) =>
                  patch("companyWebsite", { companyWebsite: v || null })
                }
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
              {newTaskExpanded ? (
                <>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Detaljer (valgfritt)"
                    rows={2}
                    className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a] resize-y"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newTaskType}
                      onChange={(e) => setNewTaskType(e.target.value)}
                      className="bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a]"
                    >
                      {TASK_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value)}
                      className="bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a]"
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="flex-1 bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a] text-[#14110e]/70"
                />
                <button
                  type="button"
                  onClick={() => setNewTaskExpanded((v) => !v)}
                  className="px-3 py-2 rounded-full border border-black/15 text-[11px] text-[#14110e]/65 hover:border-black/30"
                >
                  {newTaskExpanded ? "Mindre" : "Mer"}
                </button>
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
              {app.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                />
              ))}
              {app.tasks.length === 0 && (
                <li className="py-6 text-center text-[12px] text-[#14110e]/40">
                  Ingen oppgaver ennå.
                </li>
              )}
            </ul>
          </Card>

          <Card>
            <SectionLabel className="mb-3">Kommunikasjon</SectionLabel>
            <p className="text-[11px] text-[#14110e]/55 mb-3">
              Logg melding du har sendt eller mottatt.
            </p>
            <form onSubmit={logCommunication} className="mb-4 space-y-2">
              <div className="inline-flex bg-[#eee9df] rounded-full p-1 w-full">
                <button
                  type="button"
                  onClick={() => setCommDir("outbound")}
                  className={cn(
                    "flex-1 py-1.5 rounded-full text-[11px] transition-colors",
                    commDir === "outbound"
                      ? "bg-[#faf8f5] text-[#14110e] font-medium"
                      : "text-[#14110e]/55",
                  )}
                >
                  Jeg sendte
                </button>
                <button
                  type="button"
                  onClick={() => setCommDir("inbound")}
                  className={cn(
                    "flex-1 py-1.5 rounded-full text-[11px] transition-colors",
                    commDir === "inbound"
                      ? "bg-[#faf8f5] text-[#14110e] font-medium"
                      : "text-[#14110e]/55",
                  )}
                >
                  De svarte
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={commChannel}
                  onChange={(e) => setCommChannel(e.target.value)}
                  className="bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a]"
                >
                  {CHANNELS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={commDate}
                  onChange={(e) => setCommDate(e.target.value)}
                  className="bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a] text-[#14110e]/70"
                />
              </div>
              <textarea
                value={commNote}
                onChange={(e) => setCommNote(e.target.value)}
                placeholder={
                  commDir === "outbound"
                    ? "Hva sendte du? Lim inn e-post, kort oppsummering av samtalen …"
                    : "Hva svarte de?"
                }
                rows={3}
                className="w-full bg-[#faf8f5] border border-black/8 rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#c15a3a] resize-y"
              />
              <button
                type="submit"
                disabled={!commNote.trim()}
                className="w-full inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] disabled:opacity-40"
              >
                Loggfør
              </button>
            </form>

            <ul className="space-y-3">
              {app.activities
                .filter((a) => a.type === "communication")
                .map((a) => (
                  <li
                    key={a.id}
                    className="group rounded-xl bg-[#faf8f5] border border-black/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full",
                            a.direction === "outbound"
                              ? "bg-[#c15a3a]"
                              : "bg-[#14110e]",
                          )}
                        />
                        <span className="text-[10px] uppercase tracking-[0.15em] text-[#14110e]/65">
                          {a.direction === "outbound" ? "Jeg sendte" : "Svar"} ·{" "}
                          {channelLabel(a.channel)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteActivity(a.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#14110e]/40 hover:text-[#c15a3a]"
                        aria-label="Slett"
                      >
                        <IconClose size={12} />
                      </button>
                    </div>
                    {a.note && (
                      <div className="text-[12px] text-[#14110e]/85 whitespace-pre-wrap leading-[1.55]">
                        {a.note}
                      </div>
                    )}
                    <div className="text-[10px] text-[#14110e]/45 mt-1">
                      {formatDate(a.occurredAt, true)}
                    </div>
                  </li>
                ))}
              {!app.activities.some((a) => a.type === "communication") && (
                <li className="text-[12px] text-[#14110e]/40 text-center py-2">
                  Ingen kommunikasjon loggført.
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
                      {a.type === "communication"
                        ? `${a.direction === "outbound" ? "Du sendte" : "Du mottok"} — ${channelLabel(a.channel)}`
                        : (a.note ?? STATUS_LABEL[a.type as StatusKey] ?? a.type)}
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
            <AiTools applicationId={app.id} />
          </Card>

          <Card>
            <SectionLabel className="mb-3">Søknadsbrev</SectionLabel>
            {app.coverLetter?.body?.trim() ? (
              <>
                <p className="text-[12px] text-[#14110e]/60 mb-3">
                  Oppdatert{" "}
                  {new Date(app.coverLetter.updatedAt).toLocaleDateString(
                    "nb-NO",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </p>
                <Link
                  href={`/app/brev/${app.id}`}
                  className="inline-flex items-center justify-center gap-1.5 w-full px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors"
                >
                  Endre søknadsbrev
                  <IconArrowRight size={14} />
                </Link>
              </>
            ) : (
              <>
                <p className="text-[12px] text-[#14110e]/60 mb-3">
                  Ingen brev skrevet ennå.
                </p>
                <Link
                  href={`/app/brev/${app.id}`}
                  className="inline-flex items-center justify-center gap-1.5 w-full px-5 py-2.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors"
                >
                  Opprett søknadsbrev
                  <IconArrowRight size={14} />
                </Link>
              </>
            )}
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

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const done = !!task.completedAt;
  const overdue =
    task.dueAt && !done && new Date(task.dueAt).getTime() < Date.now();
  const prio = TASK_PRIORITIES.find((p) => p.id === task.priority);
  const type = TASK_TYPES.find((t) => t.id === task.type);

  return (
    <li className="group flex items-start gap-3 py-2 border-b border-black/5 last:border-0">
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
          onClick={() => setExpanded((v) => !v)}
          className="block text-left w-full"
        >
          <div
            className={cn(
              "text-[13px] leading-snug",
              done && "line-through text-[#14110e]/40",
            )}
          >
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] uppercase tracking-[0.12em]">
            {task.priority && task.priority !== "medium" && prio && (
              <span
                className="inline-flex items-center gap-1"
                style={{ color: prio.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: prio.color }}
                />
                {prio.label}
              </span>
            )}
            {type && (
              <span className="text-[#14110e]/55">{type.label}</span>
            )}
            {task.dueAt && (
              <span
                className={cn(
                  overdue ? "text-[#c15a3a]" : "text-[#14110e]/50",
                )}
              >
                Frist{" "}
                {new Date(task.dueAt).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
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
        onClick={() => onDelete(task)}
        className="opacity-0 group-hover:opacity-100 text-[#14110e]/40 hover:text-[#c15a3a] transition-opacity"
        aria-label="Slett oppgave"
      >
        <IconClose size={14} />
      </button>
    </li>
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
