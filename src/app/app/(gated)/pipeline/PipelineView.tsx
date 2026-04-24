"use client";

import { useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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
  readOnly = false,
}: {
  initialApplications: Application[];
  readOnly?: boolean;
}) {
  const [apps, setApps] = useState(initialApplications);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"pipeline" | "liste" | "tidslinje">("pipeline");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(ids);
    });
  }, []);

  async function bulkAction(action: "archive" | "unarchive" | "delete" | "status", status?: string) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action, status }),
      });
      if (!res.ok) throw new Error("Bulk-handlingen feilet");
      if (action === "delete") {
        setApps((prev) => prev.filter((a) => !selected.has(a.id)));
      } else if (action === "archive") {
        setApps((prev) => prev.map((a) => selected.has(a.id) ? { ...a, archivedAt: new Date().toISOString() } : a));
      } else if (action === "unarchive") {
        setApps((prev) => prev.map((a) => selected.has(a.id) ? { ...a, archivedAt: null } : a));
      } else if (action === "status" && status) {
        setApps((prev) => prev.map((a) => selected.has(a.id) ? { ...a, status, statusUpdatedAt: new Date().toISOString() } : a));
      }
      setSelected(new Set());
      setConfirmDelete(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ukjent feil");
      setTimeout(() => setError(null), 4000);
    } finally {
      setBulkLoading(false);
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
          <p className="text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mt-2">
            {apps.length} totalt ·{" "}
            {apps.filter((a) => a.status === "interview").length} intervjuer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex bg-panel rounded-full p-1">
            {(["pipeline", "liste", "tidslinje"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[12px] transition-colors capitalize",
                  view === v
                    ? "bg-bg text-ink font-medium"
                    : "text-[#14110e]/60 dark:text-[#f0ece6]/60 hover:text-ink",
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
                  ? "bg-ink text-bg border-transparent"
                  : "bg-surface text-[#14110e]/70 dark:text-[#f0ece6]/70 border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25",
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
                  ? "bg-ink text-bg border-transparent"
                  : "bg-surface text-[#14110e]/70 dark:text-[#f0ece6]/70 border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25",
              )}
              aria-pressed={showArchived}
            >
              {showArchived ? "Skjul arkiverte" : `Vis arkiverte (${archivedCount})`}
            </button>
          )}

          <label className="relative">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#14110e]/45 dark:text-[#f0ece6]/45"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søk…"
              className="pl-8 pr-4 py-1.5 rounded-full bg-surface border border-black/8 dark:border-white/8 text-[12px] w-40 outline-none focus:border-accent"
            />
          </label>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setNewModalOpen(true)}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
            >
              <IconPlus size={14} />
              Ny søknad
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-2xl bg-[#D5592E]/10 border border-[#D5592E]/30 text-[12px] text-[#D5592E]">
          {error}
        </div>
      )}

      <NewApplicationModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
      />

      {view === "liste" ? (
        <ListView
          apps={filtered}
          selected={selected}
          onToggle={toggleSelect}
          onToggleAll={toggleSelectAll}
          readOnly={readOnly}
        />
      ) : view === "tidslinje" ? (
        <TimelineView apps={filtered} />
      ) : (
        <DndContext
          sensors={readOnly ? [] : sensors}
          onDragStart={readOnly ? undefined : (e: DragStartEvent) => setDraggingId(String(e.active.id))}
          onDragEnd={readOnly ? undefined : handleDragEnd}
          onDragCancel={readOnly ? undefined : () => setDraggingId(null)}
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

      {/* Bulk action bar */}
      {selected.size > 0 && typeof window !== "undefined" &&
        createPortal(
          <BulkActionBar
            count={selected.size}
            loading={bulkLoading}
            onArchive={() => bulkAction("archive")}
            onUnarchive={() => bulkAction("unarchive")}
            onStatus={(s) => bulkAction("status", s)}
            onDelete={() => setConfirmDelete(true)}
            onClear={() => setSelected(new Set())}
          />,
          document.body,
        )}

      {/* Delete confirmation */}
      {confirmDelete && typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-surface rounded-3xl p-6 max-w-sm w-full shadow-xl">
              <h2 className="text-[18px] font-medium mb-2">Slett {selected.size} søknad{selected.size !== 1 ? "er" : ""}?</h2>
              <p className="text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60 mb-6 leading-relaxed">
                Dette kan ikke angres. All data, oppgaver og aktivitet slettes permanent.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkAction("delete")}
                  disabled={bulkLoading}
                  className="flex-1 px-4 py-2.5 rounded-full bg-accent text-white text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] disabled:opacity-50"
                >
                  {bulkLoading ? "Sletter …" : "Slett permanent"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-black/15 dark:border-white/15 text-[13px] hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>,
          document.body,
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
          <span className="text-[11px] text-[#14110e]/40 dark:text-[#f0ece6]/40">{items.length}</span>
        </div>
        <button
          type="button"
          className="text-[#14110e]/40 dark:text-[#f0ece6]/40 hover:text-ink transition-colors"
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
            isOver && "bg-panel/60",
          )}
        >
          {items.map((a) => (
            <ApplicationCard key={a.id} app={a} />
          ))}
          {items.length === 0 && variant === "desktop" && (
            <div className="rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6 text-center text-[12px] text-[#14110e]/40 dark:text-[#f0ece6]/40">
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
        "group bg-surface rounded-2xl p-4 border border-black/5 dark:border-white/5 cursor-grab active:cursor-grabbing hover:border-accent/40 transition-colors",
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
        <div className="text-[11px] text-[#14110e]/55 dark:text-[#f0ece6]/55">{app.companyName}</div>
      </Link>
      <div className="mt-3 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-[#14110e]/50 dark:text-[#f0ece6]/50">
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
            className="w-16 h-20 rounded-2xl border-2 border-[#D5592E] bg-[#D5592E]/10 flex items-center justify-center text-[#D5592E] hover:bg-[#D5592E]/20 transition-colors"
            aria-label="Ny søknad"
          >
            <IconPlus size={24} />
          </button>
          <div className="w-16 h-20 rounded-2xl border-2 border-dashed border-black/15" />
        </div>
        <h2 className="text-[28px] md:text-[32px] leading-[1.05] tracking-[-0.03em] font-medium mb-3">
          Basen er tom — ennå.
        </h2>
        <p className="text-[14px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mb-8 leading-relaxed">
          Den første søknaden er alltid tyngst. La oss legge til én sammen.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full bg-accent text-bg text-[13px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors"
          >
            Opprett manuelt
          </button>
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full bg-surface border border-black/10 dark:border-white/10 text-[13px] hover:border-black/25 dark:hover:border-white/25 transition-colors"
          >
            Importer fra lenke
          </button>
          <button
            onClick={onCreate}
            className="px-5 py-3 rounded-full text-[13px] text-[#14110e]/65 dark:text-[#f0ece6]/65 hover:text-ink transition-colors"
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

function ListView({
  apps,
  selected,
  onToggle,
  onToggleAll,
  readOnly,
}: {
  apps: Application[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[]) => void;
  readOnly?: boolean;
}) {
  const allIds = apps.map((a) => a.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));

  if (!apps.length) {
    return (
      <div className="rounded-3xl bg-panel p-12 text-center text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60">
        Ingen søknader matcher søket.
      </div>
    );
  }
  return (
    <div className="rounded-3xl border border-black/8 dark:border-white/8 bg-surface overflow-hidden">
      <div className="hidden md:grid gap-4 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-[#14110e]/55 dark:text-[#f0ece6]/55 bg-panel/40 border-b border-black/8 dark:border-white/8"
        style={{ gridTemplateColumns: readOnly ? "3fr 2fr 2fr 2fr 2fr" : "2rem 3fr 2fr 2fr 2fr 2fr" }}>
        {!readOnly && (
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => onToggleAll(allIds)}
            className="w-4 h-4 cursor-pointer accent-[#D5592E]"
            aria-label="Velg alle"
          />
        )}
        <div>Rolle · Selskap</div>
        <div>Status</div>
        <div>Frist</div>
        <div>Intervju</div>
        <div className="text-right">Oppdatert</div>
      </div>
      <ul className="divide-y divide-black/5 dark:divide-white/5">
        {apps.map((a) => {
          const checked = selected.has(a.id);
          return (
            <li key={a.id} className={cn(checked && "bg-bg")}>
              <div
                className="grid grid-cols-1 gap-2 px-5 py-4 hover:bg-panel/30 transition-colors"
                style={{ gridTemplateColumns: readOnly ? "1fr" : "2rem 1fr" }}
              >
                {!readOnly && (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(a.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 cursor-pointer accent-[#D5592E] mt-1 md:mt-0 self-center"
                    aria-label={`Velg ${a.title}`}
                  />
                )}
                <Link
                  href={`/app/pipeline/${a.id}`}
                  className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4"
                >
                  <div className="md:col-span-1 min-w-0">
                    <div className="text-[14px] font-medium leading-tight truncate">{a.title}</div>
                    <div className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 truncate">{a.companyName}</div>
                  </div>
                  <div className="flex md:block items-center gap-2">
                    <StatusDot status={a.status as StatusKey} />
                  </div>
                  <div className="text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70">{formatDate(a.deadlineAt)}</div>
                  <div className="text-[12px] text-[#14110e]/70 dark:text-[#f0ece6]/70">{formatDate(a.interviewAt)}</div>
                  <div className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 md:text-right">{formatDate(a.updatedAt)}</div>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Kladd" },
  { value: "applied", label: "Søkt" },
  { value: "interview", label: "Intervju" },
  { value: "offer", label: "Tilbud" },
  { value: "accepted", label: "Takket ja" },
  { value: "rejected", label: "Avslag" },
  { value: "withdrawn", label: "Trukket" },
];

function BulkActionBar({
  count,
  loading,
  onArchive,
  onUnarchive,
  onStatus,
  onDelete,
  onClear,
}: {
  count: number;
  loading: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onStatus: (s: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-ink text-bg rounded-2xl px-4 py-3 shadow-2xl flex-wrap justify-center">
      <span className="text-[12px] font-medium whitespace-nowrap">{count} valgt</span>
      <div className="w-px h-4 bg-bg/20 hidden sm:block" />
      <select
        onChange={(e) => { if (e.target.value) { onStatus(e.target.value); e.target.value = ""; } }}
        defaultValue=""
        disabled={loading}
        className="bg-bg/10 text-bg text-[12px] rounded-xl px-3 py-1.5 border border-bg/15 focus:outline-none cursor-pointer disabled:opacity-50"
      >
        <option value="" disabled>Flytt til status…</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value} className="text-ink">{s.label}</option>
        ))}
      </select>
      <button
        onClick={onArchive}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl bg-bg/10 hover:bg-bg/20 text-[12px] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        Arkiver
      </button>
      <button
        onClick={onUnarchive}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl bg-bg/10 hover:bg-bg/20 text-[12px] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        Gjenopprett
      </button>
      <button
        onClick={onDelete}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl bg-[#D5592E]/80 hover:bg-[#D5592E] text-[12px] transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        Slett
      </button>
      <button
        onClick={onClear}
        disabled={loading}
        className="px-3 py-1.5 rounded-xl bg-bg/10 hover:bg-bg/20 text-[12px] transition-colors disabled:opacity-50"
        aria-label="Fjern valg"
      >
        ✕
      </button>
    </div>
  );
}

function TimelineView({ apps }: { apps: Application[] }) {
  if (!apps.length) {
    return (
      <div className="rounded-3xl bg-panel p-12 text-center text-[13px] text-[#14110e]/60 dark:text-[#f0ece6]/60">
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
        color: "#D5592E",
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
        color: "#D5592E",
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
        color: "#D5592E",
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
              className="absolute left-[6px] top-2 bottom-2 w-px bg-black/10 dark:bg-white/10"
              aria-hidden
            />
            {items.map((e) => {
              const future = e.at.getTime() > now;
              return (
                <li key={e.id} className="relative pl-8 pb-5 last:pb-0">
                  <span
                    className="absolute left-0 top-1.5 size-[13px] rounded-full border-2 border-bg"
                    style={{ background: e.color }}
                    aria-hidden
                  />
                  <Link
                    href={`/app/pipeline/${e.app.id}`}
                    className="block group"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#14110e]/55 dark:text-[#f0ece6]/55 mb-0.5">
                          {e.label}
                          {future && (
                            <span className="ml-2 text-accent">kommende</span>
                          )}
                        </div>
                        <div className="text-[14px] font-medium group-hover:text-accent transition-colors truncate">
                          {e.app.title}
                        </div>
                        <div className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 truncate">
                          {e.app.companyName}
                        </div>
                      </div>
                      <span className="text-[11px] text-[#14110e]/60 dark:text-[#f0ece6]/60 shrink-0">
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
