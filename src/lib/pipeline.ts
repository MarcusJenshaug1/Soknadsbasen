import type { StatusKey } from "@/components/ui/StatusDot";

/** Columns shown on the pipeline kanban, in visual order. */
export const PIPELINE_COLUMNS: {
  status: StatusKey;
  label: string;
  dotColor: string;
}[] = [
  { status: "draft", label: "Kladd", dotColor: "#94a3b8" },
  { status: "applied", label: "Sendt", dotColor: "#c15a3a" },
  { status: "interview", label: "Intervju", dotColor: "#14110e" },
  { status: "offer", label: "Tilbud", dotColor: "#16a34a" },
  { status: "rejected", label: "Avslag", dotColor: "#d1d5db" },
];

export const PIPELINE_STATUSES = PIPELINE_COLUMNS.map((c) => c.status);

/** Statuses not shown in the default kanban view (archived). */
export const ARCHIVED_STATUSES: StatusKey[] = ["accepted", "withdrawn"];

export function isPipelineStatus(s: string): s is StatusKey {
  return (PIPELINE_STATUSES as string[]).includes(s);
}
