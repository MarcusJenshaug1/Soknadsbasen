import Link from "next/link";
import { formatNok, relativeNb } from "@/lib/sales/format";
import { stageMeta } from "@/lib/sales/stages";

export type LeadCardData = {
  id: string;
  stage: string;
  probability: number;
  source: string;
  estimatedValueCents: number;
  expectedSeats: number;
  title: string;
  companyName: string;
  companyWebsite: string | null;
  orgId: string | null;
  closedAt: Date | string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
};

export function LeadCard({ lead, asLink = true }: { lead: LeadCardData; asLink?: boolean }) {
  const meta = stageMeta(lead.stage);
  const inner = (
    <div
      className="rounded-lg bg-bg dark:bg-surface border border-black/6 dark:border-white/6 px-3 py-2.5 hover:bg-surface dark:hover:bg-white/[0.02] transition-colors"
      style={{ borderLeft: `2px solid ${meta.color}` }}
    >
      <div className="text-[12px] font-medium truncate">{lead.companyName}</div>
      <div className="flex items-center justify-between text-[10px] text-ink/55 mt-1 font-mono gap-2">
        <span className="truncate">{formatNok(lead.estimatedValueCents, { compact: true })}</span>
        <span className="shrink-0 text-ink/45">{relativeNb(lead.updatedAt)}</span>
      </div>
    </div>
  );
  if (!asLink) return inner;
  return (
    <Link href={`/selger/leads/${lead.id}`} prefetch={true} className="block">
      {inner}
    </Link>
  );
}
