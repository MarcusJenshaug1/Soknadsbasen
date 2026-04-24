import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionWithAccess } from "@/lib/auth";
import { getAllSessions } from "@/lib/session-context";
import { SectionLabel } from "@/components/ui/Pill";
import { SessionHistoryClient } from "./SessionHistoryClient";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  GOT_JOB: "Fikk jobb",
  PAUSE: "Tok pause",
  OTHER: "Avsluttet",
};

export default async function SesjonerPage() {
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn");

  const sessions = await getAllSessions();

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 font-sans max-w-3xl">
      <SectionLabel className="mb-3">Historikk</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-2">
        Sesjoner
      </h1>
      <p className="text-[13px] text-[#14110e]/60 mb-8">
        Alle søkerunder, med statistikk og lenke til pipeline-arkivet.
      </p>

      {sessions.length === 0 ? (
        <div className="text-[13px] text-[#14110e]/55 py-12 text-center">
          Ingen sesjoner ennå. Start en søknad for å opprette din første sesjon automatisk.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const start = new Date(s.startedAt).toLocaleDateString("nb-NO", {
              day: "numeric", month: "long", year: "numeric",
            });
            const end = s.closedAt
              ? new Date(s.closedAt).toLocaleDateString("nb-NO", {
                  day: "numeric", month: "long", year: "numeric",
                })
              : null;

            return (
              <div
                key={s.id}
                className="border border-black/8 rounded-2xl px-5 py-4 bg-white hover:border-black/15 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-medium">{s.name}</span>
                      {s.status === "ACTIVE" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">Aktiv</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-[#eee9df] text-[#14110e]/55 text-[10px]">
                          {s.outcome ? OUTCOME_LABELS[s.outcome] : "Avsluttet"}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#14110e]/50">
                      {start}{end ? ` – ${end}` : ""}
                      {" · "}{s._count.applications} søknader
                    </div>
                    {s.notes && (
                      <div className="text-[12px] text-[#14110e]/65 mt-1.5 italic">{s.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/app/pipeline?session=${s.id}`}
                      className="px-3 py-1.5 rounded-full text-[12px] border border-black/10 hover:border-black/25 transition-colors"
                    >
                      Se pipeline
                    </Link>
                    {s.status === "CLOSED" && (
                      <SessionHistoryClient sessionId={s.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
