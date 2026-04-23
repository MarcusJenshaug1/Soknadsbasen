"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { PIPELINE_COLUMNS, isPipelineStatus } from "@/lib/pipeline";

const TERMINAL_STATUSES: StatusKey[] = ["accepted", "declined", "rejected"];
const ACTIVE_COLUMNS = PIPELINE_COLUMNS.filter(
  (c) => !TERMINAL_STATUSES.includes(c.status),
);
import { StatusDot, STATUS_LABEL, type StatusKey } from "@/components/ui/StatusDot";
import { SectionLabel, Pill } from "@/components/ui/Pill";
import { IconPlus, IconSearch } from "@/components/ui/Icons";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { cn } from "@/lib/cn";
import { NewApplicationModal } from "./NewApplicationModal";

type Application = {
  id: string;
  companyName: string;
  companyWebsite?: string | null;
  title: string;
  status: string;
  statusUpdatedAt: Date | string;
  applicationDate: Date | string | null;
  deadlineAt: Date | string | null;
  interviewAt: Date | string | null;
  followUpAt: Date | string | null;
  archivedAt: Date | string | null;
  updatedAt: Date | string;
};

const toMs = (d: Date | string | null | undefined) =>
  d ? new Date(d).getTime() : null;

const daysBetween = (a: number, b: number) =>
  Math.round((a - b) / (1000 * 60 * 60 * 24));

function nextLabel(app: Application): { text: string; days: number | null } {
  const now = Date.now();
  const interview = toMs(app.interviewAt);
  const deadline = toMs(app.deadlineAt);
  const followUp = toMs(app.followUpAt);

  if (app.status === "interview" && interview) {
    const d = daysBetween(interview, now);
    return { text: d >= 0 ? "Intervju" : "Intervju passert", days: Math.abs(d) };
  }
  if (app.status === "applied" && followUp) {
    const d = daysBetween(followUp, now);
    return { text: d >= 0 ? "Oppfølging" : "Oppfølging passert", days: Math.abs(d) };
  }
  if (deadline) {
    const d = daysBetween(deadline, now);
    return { text: d >= 0 ? "Frist" : "Frist passert", days: Math.abs(d) };
  }
  if (app.status === "draft") return { text: "Kladd", days: null };
  if (app.status === "offer") return { text: "Tilbud mottatt", days: null };
  if (app.status === "rejected") {
    const d = daysBetween(now, toMs(app.statusUpdatedAt) ?? now);
    return { text: "Avslag", days: d };
  }
  const d = daysBetween(now, toMs(app.statusUpdatedAt) ?? now);
  return { text: "Sist oppdatert", days: d };
}

function isUrgent(app: Application): boolean {
  const now = Date.now();
  const soon = 1000 * 60 * 60 * 24 * 3;
  const interview = toMs(app.interviewAt);
  const deadline = toMs(app.deadlineAt);
  if (interview && interview - now <= soon && interview - now > 0) return true;
  if (deadline && deadline - now <= soon && deadline - now > 0) return true;
  return false;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PipelineView({
  initialApplications,
}: {
  initialApplications: Application[];
}) {
  const [apps, setApps] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"pipeline" | "liste" | "tidslinje">("pipeline");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const visibleColumns = showCompleted ? PIPELINE_COLUMNS : ACTIVE_COLUMNS;
  const notArchivedApps = apps.filter((a) => !a.archivedAt);
  const archivedCount = apps.length - notArchivedApps.length;
  const completedCount = notArchivedApps.filter((a) =>
    TERMINAL_STATUSES.includes(a.status as StatusKey),
  ).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtered = useMemo(() => {
    const base = showArchived ? apps : apps.filter((a) => !a.archivedAt);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter(
      (a) =>
        a.companyName.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q),
    );
  }, [apps, search, showArchived]);

  const byColumn = useMemo(() => {
    const map = new Map<StatusKey, Application[]>();
    for (const col of visibleColumns) map.set(col.status, []);
    for (const a of filtered) {
      if (isPipelineStatus(a.status) && map.has(a.status as StatusKey)) {
        map.get(a.status as StatusKey)!.push(a);
      }
    }
    return map;
  }, [filtered, visibleColumns]);

  const draggingApp = draggingId ? apps.find((a) => a.id === draggingId) ?? null : null;

  async function handleDragEnd(e: DragEndEvent) {
    setDraggingId(null);
    const appId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    // Drop target can be a column id ("col:<status>") or another card id.
    let targetStatus: StatusKey | null = null;
    if (overId.startsWith("col:")) {
      const s = overId.slice(4) as StatusKey;
      if (isPipelineStatus(s)) targetStatus = s;
    } else {
      const overApp = apps.find((a) => a.id === overId);
      if (overApp && isPipelineStatus(overApp.status)) targetStatus = overApp.status;
    }
    if (!targetStatus) return;

    const current = apps.find((a) => a.id === appId);
    if (!current || current.status === targetStatus) return;

    const prev = apps;
    const nextStatus = targetStatus;
    setApps((xs) =>
      xs.map((a) =>
        a.id === appId
          ? { ...a, status: nextStatus, statusUpdatedAt: new Date().toISOString() }
          : a,
      ),
    );

    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Kunne ikke oppdatere status");
    } catch (err) {
      setApps(prev);
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setTimeout(() => setError(null), 4000);
    }
  }

  const isEmpty = apps.length === 0;

  if (isEmpty) {
    return (
      <>
        <EmptyState onCreate={() => setNewModalOpen(true)} />
        <NewApplicationModal
          open={newModalOpen}
          onClose={() => setNewModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <SectionLabel className="mb-3">Pipeline</SectionLabel>
          <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium">
            Søknadene dine
          </h1>
          <p className="text-[13px] text-[#14110e]/60 mt-2">
            {apps.length} totalt ·{" "}
            {apps.filter((a) => a.status === "interview").length} intervjuer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-[#eee9df] rounded-full p-1">
            {(["pipeline", "liste", "tidslinje"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] transition-colors capitalize",
                  view === v
                    ? "bg-[#faf8f5] text-[#14110e] font-medium"
                    : "text-[#14110e]/60 hover:text-[#14110e]",
                )}
              >
                {v === "pipeline" ? "Pipeline" : v === "liste" ? "Liste" : "Tidslinje"}
              </button>
            ))}
          </div>

          {view === "pipeline" && completedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[12px] transition-colors border",
                showCompleted
                  ? "bg-[#14110e] text-[#faf8f5] border-transparent"
                  : "bg-white text-[#14110e]/70 border-black/10 hover:border-black/25",
              )}
              aria-pressed={showCompleted}
            >
              {showCompleted ? "Skjul avsluttede" : `Vis avsluttede (${completedCount})`}
            </button>
          )}

          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[12px] transition-colors border",
                showArchived
                  ? "bg-[#14110e] text-[#faf8f5] border-transparent"
                  : "bg-white text-[#14110e]/70 border-black/10 hover:border-black/25",
              )}
              aria-pressed={showArchived}
            >
              {showArchived ? "Skjul arkiverte" : `Vis arkiverte (${archivedCount})`}
            </button>
          )}

          <label className="relative">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14110e]/45"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk…"
              className="pl-8 pr-4 py-1.5 rounded-full bg-white border border-black/8 text-[12px] w-40 outline-none focus:border-[#c15a3a]"
            />
          </label>

          <button
            type="button"
            onClick={() => setNewModalOpen(true)}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#14110e] text-[#faf8f5] text-[12px] font-medium hover:bg-[#c15a3a] transition-colors"
          >
            <IconPlus size={14} />
            Ny søknad
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-[#c15a3a]/10 border border-[#c15a3a]/30 text-[12px] text-[#c15a3a]">
          {error}
        </div>
      )}

      <NewApplicationModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
      />

      {view === "liste" ? (
        <ListView apps={filtered} />
      ) : view === "tidslinje" ? (
        <TimelineView apps={filtered} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={(e: DragStartEvent) => setDraggingId(String(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          {/* Mobile: stacked */}
          <div className="md:hidden space-y-5">
            {visibleColumns.map((col) => (
              <Column
                key={col.status}
                label={col.label}
                dotColor={col.dotColor}
                status={col.status}
                items={byColumn.get(col.status) ?? []}
                variant="mobile"
              />
            ))}
          </div>

          {/* Desktop: fills full width, kolonner matcher visibleColumns */}
          <div
            className="hidden md:grid gap-2 items-start"
            style={{
              gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
            }}
          >
            {visibleColumns.map((col) => (
              <Column
                key={col.status}
                label={col.label}
                dotColor={col.dotColor}
                status={col.status}
                items={byColumn.get(col.status) ?? []}
                variant="desktop"
              />
            ))}
          </div>

          <DragOverlay>
            {draggingApp ? <ApplicationCard app={draggingApp} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function Column({
  label,
  dotColor,
  status,
  items,
  variant,
}: {
  label: string;
  dotColor: string;
  status: StatusKey;
  items: Application[];
  variant: "mobile" | "desktop";
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });

  return (
    <div
      className={cn(
        variant === "desktop" ? "flex flex-col min-w-0" : "",
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: dotColor }}
          />
          <span className="text-[11px] uppercase tracking-[0.2em] font-medium">
            {label}
          </span>
          <span className="text-[11px] text-[#14110e]/40">{items.length}</span>
        </div>
        <button
          type="button"
          className="text-[#14110e]/40 hover:text-[#14110e] transition-colors"
          aria-label={`Legg til i ${label}`}
        >
          <IconPlus size={16} />
        </button>
      </div>
      <SortableContext
        items={items.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={cn(
            "space-y-2 rounded-2xl transition-colors",
            variant === "desktop" && "flex-1 min-h-[140px] p-1",
            isOver && "bg-[#eee9df]/60",
          )}
        >
          {items.map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
          {items.length === 0 && variant === "desktop" && (
            <div className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-[12px] text-[#14110e]/40">
              Tom
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function ApplicationCard({
  app,
  overlay = false,
}: {
  app: Application;
  overlay?: boolean;
}) {
  const sortable = useSortable({ id: app.id, disabled: overlay });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortable;
  const style = overlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      };
  const next = nextLabel(app);
  const urgent = isUrgent(app);
  const isArchived = !!app.archivedAt;

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        "group bg-white rounded-2xl p-4 border border-black/5 cursor-grab active:cursor-grabbing hover:border-[#c15a3a]/40 transition-colors",
        overlay && "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.25)] rotate-[1deg]",
        isArchived && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <CompanyLogo
          website={app.companyWebsite}
          name={app.companyName}
          size="sm"
        />
        {isArchived ? (
          <Pill variant="muted">Arkivert</Pill>
        ) : urgent ? (
          <Pill variant="accent">Hast</Pill>
        ) : null}
      </div>
      <Link
        href={`/app/pipeline/${app.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <div className="text-[14px] font-medium leading-tight mb-1">
          {app.title}
        </div>
        <div className="text-[11px] text-[#14110e]/55">{app.companyName}</div>
      </Link>
      <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[10px] text-[#14110e]/50">
        <span>{next.text}</span>
        {next.days !== null && <span>{next.days}d</span>}
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-10 py-6 md:py-10">
      <SectionLabel className="mb-3">Pipeline</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-16">
        Søknadene dine
      </h1>
      <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
        <div className="flex justify-center gap-3 mb-8">
          <div className="w-16 h-20 rounded-2xl border-2 border-dashed border-black/15" />
          <button
            onClick={onCreate}
            className="w-16 h-20 rounded-2xl border-2 border-[#c15a3a] bg-[#c15a3a]/10 flex items-center justify-center text-[#c15a3a] hover:bg-[#c15a3a]/20 transition-colors"
            aria-label="Ny søknad"
          >
            <IconPlus size={24} />
          </button>
          <div className="w-16 h-20 rounded-2xl border-2 border-dashed border-black/15" />
        </div>
        <h2 className="text-[28px] md:text-[32px] leading-[1.05] tracking-[-0.03em] font-medium mb-3">
          Basen er tom — ennå.
        </h2>
        <p className="text-[14px] text-[#14110e]/65 mb-8 leading-relaxed">
          Den første søknaden er alltid tyngst. La oss legge til én sammen.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full bg-[#14110e] text-[#faf8f5] text-[13px] font-medium hover:bg-[#c15a3a] transition-colors"
          >
            Opprett manuelt
          </button>
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full bg-white border border-black/10 text-[13px] hover:border-black/25 transition-colors"
          >
            Importer fra lenke
          </button>
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full text-[13px] text-[#14110e]/65 hover:text-[#14110e] transition-colors"
          >
            Lim inn stillingstekst
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ListView({ apps }: { apps: Application[] }) {
  if (!apps.length) {
    return (
      <div className="rounded-3xl bg-[#eee9df] p-12 text-center text-[13px] text-[#14110e]/60">
        Ingen søknader matcher søket.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-black/8 bg-white overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#14110e]/55 bg-[#eee9df]/40 border-b border-black/8">
        <div className="col-span-4">Rolle · Selskap</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Frist</div>
        <div className="col-span-2">Intervju</div>
        <div className="col-span-2 text-right">Oppdatert</div>
      </div>
      <ul className="divide-y divide-black/5">
        {apps.map((a) => (
          <li key={a.id}>
            <Link
              href={`/app/pipeline/${a.id}`}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-[#eee9df]/30 transition-colors"
            >
              <div className="col-span-4 min-w-0">
                <div className="text-[14px] font-medium leading-tight truncate">
                  {a.title}
                </div>
                <div className="text-[12px] text-[#14110e]/55 truncate">
                  {a.companyName}
                </div>
              </div>
              <div className="col-span-2 flex md:block items-center gap-2">
                <StatusDot status={a.status as StatusKey} />
              </div>
              <div className="col-span-2 text-[12px] text-[#14110e]/70">
                {formatDate(a.deadlineAt)}
              </div>
              <div className="col-span-2 text-[12px] text-[#14110e]/70">
                {formatDate(a.interviewAt)}
              </div>
              <div className="col-span-2 text-[12px] text-[#14110e]/55 md:text-right">
                {formatDate(a.updatedAt)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimelineView({ apps }: { apps: Application[] }) {
  if (!apps.length) {
    return (
      <div className="rounded-3xl bg-[#eee9df] p-12 text-center text-[13px] text-[#14110e]/60">
        Ingen søknader matcher søket.
      </div>
    );
  }

  // Build flat list of events: creation + application + interview + deadline
  type Event = {
    id: string;
    at: Date;
    app: Application;
    label: string;
    color: string;
  };

  const events: Event[] = [];
  for (const a of apps) {
    const statusColor =
      PIPELINE_COLUMNS.find((c) => c.status === a.status)?.dotColor ??
      "#94a3b8";
    if (a.applicationDate) {
      events.push({
        id: `${a.id}:applied`,
        at: new Date(a.applicationDate),
        app: a,
        label: "Søknad sendt",
        color: "#c15a3a",
      });
    } else {
      events.push({
        id: `${a.id}:created`,
        at: new Date(a.statusUpdatedAt ?? a.updatedAt),
        app: a,
        label: `Opprettet (${STATUS_LABEL[a.status as StatusKey] ?? a.status})`,
        color: statusColor,
      });
    }
    if (a.deadlineAt) {
      events.push({
        id: `${a.id}:deadline`,
        at: new Date(a.deadlineAt),
        app: a,
        label: "Søknadsfrist",
        color: "#c15a3a",
      });
    }
    if (a.interviewAt) {
      events.push({
        id: `${a.id}:interview`,
        at: new Date(a.interviewAt),
        app: a,
        label: "Intervju",
        color: "#14110e",
      });
    }
    if (a.followUpAt) {
      events.push({
        id: `${a.id}:followup`,
        at: new Date(a.followUpAt),
        app: a,
        label: "Oppfølging",
        color: "#c15a3a",
      });
    }
  }

  events.sort((a, b) => b.at.getTime() - a.at.getTime());

  // Group by month for section dividers.
  const monthKey = (d: Date) =>
    d.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });

  const groups = new Map<string, Event[]>();
  for (const e of events) {
    const k = monthKey(e.at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }

  const now = Date.now();

  return (
    <div className="space-y-10">
      {Array.from(groups.entries()).map(([month, items]) => (
        <section key={month}>
          <SectionLabel className="mb-4 capitalize">{month}</SectionLabel>
          <ul className="relative">
            <span
              className="absolute left-[6px] top-2 bottom-2 w-px bg-black/10"
              aria-hidden
            />
            {items.map((e) => {
              const future = e.at.getTime() > now;
              return (
                <li key={e.id} className="relative pl-8 pb-5 last:pb-0">
                  <span
                    className="absolute left-0 top-1.5 size-[13px] rounded-full border-2 border-[#faf8f5]"
                    style={{ background: e.color }}
                    aria-hidden
                  />
                  <Link
                    href={`/app/pipeline/${e.app.id}`}
                    className="block group"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/55 mb-0.5">
                          {e.label}
                          {future && (
                            <span className="ml-2 text-[#c15a3a]">kommende</span>
                          )}
                        </div>
                        <div className="text-[14px] font-medium group-hover:text-[#c15a3a] transition-colors truncate">
                          {e.app.title}
                        </div>
                        <div className="text-[12px] text-[#14110e]/55 truncate">
                          {e.app.companyName}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#14110e]/60 shrink-0">
                        {e.at.toLocaleDateString("nb-NO", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
