import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiHome,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import type { IconType } from "react-icons";

import { HJEMMEKONTOR_LABELS, type HjemmekontorCode } from "@/lib/jobs/facets";
import { displayPlace } from "@/lib/jobs/format";

const DATE_FMT = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" });

/**
 * Nøkkelinfo-boks øverst på detaljsiden/hurtigvisningen (designreferansen):
 * panel-grid med uppercase ikonetiketter for frist, omfang, sted, sektor,
 * ansettelsesform og hjemmekontor.
 */
export function KeyInfoBox({
  job,
}: {
  job: {
    applicationDueAt: Date | null;
    expiresAt: Date | null;
    extent: string | null;
    employmentType: string | null;
    kommune: string | null;
    location: string | null;
    region: string | null;
    sector: string | null;
    engagementType: string | null;
    aiRemote: string | null;
    positionCount: number | null;
  };
}) {
  const due = job.applicationDueAt ?? job.expiresAt;
  const sted =
    job.kommune ?? displayPlace(job.location ?? job.region) ?? null;
  const remoteLabel = job.aiRemote
    ? (HJEMMEKONTOR_LABELS[job.aiRemote as HjemmekontorCode] ?? null)
    : null;

  const rows: { icon: IconType; label: string; value: string }[] = [];
  if (due) rows.push({ icon: FiCalendar, label: "Søknadsfrist", value: DATE_FMT.format(due) });
  if (job.extent || job.employmentType) {
    rows.push({
      icon: FiClock,
      label: "Omfang",
      value: job.extent ?? job.employmentType ?? "",
    });
  }
  if (sted) rows.push({ icon: FiMapPin, label: "Sted", value: sted });
  if (job.engagementType) {
    rows.push({ icon: FiBriefcase, label: "Ansettelsesform", value: job.engagementType });
  }
  if (job.sector) rows.push({ icon: FiUsers, label: "Sektor", value: job.sector });
  if (remoteLabel) rows.push({ icon: FiHome, label: "Hjemmekontor", value: remoteLabel });

  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-panel p-4 sm:grid-cols-3">
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            <Icon size={11} aria-hidden /> {label}
          </dt>
          <dd className="mt-1 truncate text-[12.5px] font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
