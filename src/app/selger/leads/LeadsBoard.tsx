"use client";

import dynamic from "next/dynamic";
import { LeadsList } from "./LeadsList";
import type { LeadCardData } from "./LeadCard";

const LeadsKanban = dynamic(() => import("./LeadsKanban").then((m) => m.LeadsKanban), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] animate-pulse" />
  ),
});

export function LeadsBoard({
  leads,
  initialView,
}: {
  leads: LeadCardData[];
  initialView: "kanban" | "list";
}) {
  if (initialView === "list") return <LeadsList leads={leads} />;
  return <LeadsKanban leads={leads} />;
}
