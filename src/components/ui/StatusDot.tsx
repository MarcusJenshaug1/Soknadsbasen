import { cn } from "@/lib/cn";

export type StatusKey =
  | "draft"
  | "applied"
  | "interview"
  | "offer"
  | "accepted"
  | "declined"
  | "rejected"
  | "withdrawn";

export const STATUS_COLOR: Record<StatusKey, string> = {
  draft: "#94a3b8",
  applied: "#D5592E",
  interview: "#14110e",
  offer: "#16a34a",
  accepted: "#16a34a",
  declined: "#94a3b8",
  rejected: "#d1d5db",
  withdrawn: "#d1d5db",
};

export const STATUS_LABEL: Record<StatusKey, string> = {
  draft: "Kladd",
  applied: "Sendt",
  interview: "Intervju",
  offer: "Tilbud",
  accepted: "Takket ja",
  declined: "Takket nei",
  rejected: "Avslag",
  withdrawn: "Trukket",
};

export function StatusDot({
  status,
  showLabel = true,
  className,
}: {
  status: StatusKey;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: STATUS_COLOR[status] }}
      />
      {showLabel && (
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#14110e]/60 dark:text-[#f0ece6]/60">
          {STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}
