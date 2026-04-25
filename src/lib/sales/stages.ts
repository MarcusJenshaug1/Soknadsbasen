export const PIPELINE_STAGES = [
  { id: "Ny",           label: "Ny",           probability: 10,  color: "var(--sales-stage-ny)" },
  { id: "Kontaktet",    label: "Kontaktet",    probability: 25,  color: "var(--sales-stage-kontaktet)" },
  { id: "Demo booket",  label: "Demo",         probability: 50,  color: "var(--sales-stage-demo)" },
  { id: "Tilbud sendt", label: "Tilbud",       probability: 70,  color: "var(--sales-stage-tilbud)" },
  { id: "Forhandling",  label: "Forhandling",  probability: 90,  color: "var(--sales-stage-forhandling)" },
  { id: "Vunnet",       label: "Vunnet",       probability: 100, color: "var(--sales-stage-vunnet)" },
  { id: "Tapt",         label: "Tapt",         probability: 0,   color: "var(--sales-stage-tapt)" },
] as const;

export type PipelineStageId = (typeof PIPELINE_STAGES)[number]["id"];

export const ACTIVE_STAGES: readonly PipelineStageId[] = [
  "Ny",
  "Kontaktet",
  "Demo booket",
  "Tilbud sendt",
  "Forhandling",
  "Vunnet",
];

export const KANBAN_STAGES: readonly PipelineStageId[] = [
  "Ny",
  "Kontaktet",
  "Demo booket",
  "Tilbud sendt",
  "Forhandling",
  "Vunnet",
];

export const COMMISSION_STATUS = {
  pending:  { label: "Pending",          color: "var(--sales-commission-pending)" },
  eligible: { label: "Klar til utbet.",  color: "var(--sales-commission-eligible)" },
  paid:     { label: "Utbetalt",         color: "var(--sales-commission-paid)" },
  clawback: { label: "Clawback",         color: "var(--sales-commission-clawback)" },
  voided:   { label: "Annullert",        color: "var(--sales-commission-pending)" },
} as const;

export type CommissionStatus = keyof typeof COMMISSION_STATUS;

export function stageMeta(id: string) {
  return PIPELINE_STAGES.find((s) => s.id === id) ?? PIPELINE_STAGES[0];
}
