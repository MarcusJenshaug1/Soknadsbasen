import type { StatusKey } from "@/components/ui/StatusDot";

/**
 * Per-status definitions (color + label) for every pipeline status.
 * Used for status-pills, the detail-view status selector, the bulk menu and
 * timeline coloring — anywhere we need the *granular* status, not the kanban
 * grouping. No status is ever removed here; only the visual kanban grouping
 * (KANBAN_COLUMNS) collapses the terminal outcomes into one column.
 */
export const PIPELINE_COLUMNS: {
  status: StatusKey;
  label: string;
  dotColor: string;
}[] = [
  { status: "draft", label: "Kladd", dotColor: "#94a3b8" },
  { status: "applied", label: "Sendt", dotColor: "#D5592E" },
  { status: "interview", label: "Intervju", dotColor: "#14110e" },
  { status: "offer", label: "Tilbud", dotColor: "#16a34a" },
  { status: "accepted", label: "Takket ja", dotColor: "#16a34a" },
  { status: "declined", label: "Takket nei", dotColor: "#94a3b8" },
  { status: "rejected", label: "Avslag", dotColor: "#d1d5db" },
];

export const PIPELINE_STATUSES = PIPELINE_COLUMNS.map((c) => c.status);

/** The three terminal outcomes, collapsed into the "Avsluttet" kanban column. */
export const TERMINAL_STATUSES: StatusKey[] = [
  "accepted",
  "declined",
  "rejected",
];

/**
 * Kanban column definitions, in visual order. Each column owns one or more
 * statuses; a card lands in the column whose `statuses` contains its status.
 * The three terminal outcomes (accepted/declined/rejected) share the single
 * "Avsluttet" column — the granular status survives as data + status-pill.
 *
 * `defaultDropStatus` is the status applied when a card is dropped on the
 * column. For "Avsluttet" we default to "rejected" (the most common terminal
 * outcome) and let the user pick the precise outcome in the detail view; this
 * keeps the drag-PATCH a single, robust write without an extra popover step.
 */
export const KANBAN_COLUMNS: {
  id: string;
  label: string;
  dotColor: string;
  statuses: StatusKey[];
  defaultDropStatus: StatusKey;
}[] = [
  {
    id: "draft",
    label: "Kladd",
    dotColor: "#94a3b8",
    statuses: ["draft"],
    defaultDropStatus: "draft",
  },
  {
    id: "applied",
    label: "Sendt",
    dotColor: "#D5592E",
    statuses: ["applied"],
    defaultDropStatus: "applied",
  },
  {
    id: "interview",
    label: "Intervju",
    dotColor: "#14110e",
    statuses: ["interview"],
    defaultDropStatus: "interview",
  },
  {
    id: "offer",
    label: "Tilbud",
    dotColor: "#16a34a",
    statuses: ["offer"],
    defaultDropStatus: "offer",
  },
  {
    id: "completed",
    label: "Avsluttet",
    dotColor: "#94a3b8",
    statuses: TERMINAL_STATUSES,
    defaultDropStatus: "rejected",
  },
];

export const ACTIVE_KANBAN_COLUMNS = KANBAN_COLUMNS.filter(
  (c) => c.id !== "completed",
);

export function columnForStatus(status: string) {
  return KANBAN_COLUMNS.find((c) =>
    (c.statuses as string[]).includes(status),
  );
}

/** Statuses not shown in the default kanban view (archived). */
export const ARCHIVED_STATUSES: StatusKey[] = ["withdrawn"];

export function isPipelineStatus(s: string): s is StatusKey {
  return (PIPELINE_STATUSES as string[]).includes(s);
}
