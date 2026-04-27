"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KANBAN_STAGES, PIPELINE_STAGES } from "@/lib/sales/stages";
import { LeadCard, type LeadCardData } from "./LeadCard";

export function LeadsKanban({ leads: initial }: { leads: LeadCardData[] }) {
  const [leads, setLeads] = useState(initial);
  const router = useRouter();

  const columns = KANBAN_STAGES.map((id) => {
    const meta = PIPELINE_STAGES.find((s) => s.id === id)!;
    return { id, label: meta.label, color: meta.color };
  });

  async function moveLead(id: string, toStage: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage: toStage } : l)));
    const res = await fetch(`/api/sales/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: toStage }),
    });
    if (!res.ok) {
      setLeads(initial);
      alert("Klarte ikke flytte lead. Prøv igjen.");
      return;
    }
    router.refresh();
  }

  return (
    <KanbanBoard<LeadCardData>
      columns={columns}
      items={leads}
      getColumnId={(l) => l.stage}
      renderCard={(l) => <LeadCard lead={l} asLink />}
      onMove={moveLead}
    />
  );
}
