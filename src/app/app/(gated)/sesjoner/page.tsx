import { redirect } from "next/navigation";
import { getSessionWithAccess } from "@/lib/auth";
import { getAllSessions } from "@/lib/session-context";
import { SectionLabel } from "@/components/ui/Pill";
import type { SessionSummary } from "@/store/useSessionStore";
import { SessionHistoryClient } from "./SessionHistoryClient";
import { ShareLinkWidget } from "./ShareLinkWidget";

export const dynamic = "force-dynamic";

export default async function SesjonerPage() {
  // getSessionWithAccess + getAllSessions kan kjøres parallelt — begge er
  // cached og getAllSessions trenger bare userId via getSessionUserId.
  const [session, sessions] = await Promise.all([
    getSessionWithAccess(),
    getAllSessions(),
  ]);
  if (!session) redirect("/logg-inn");

  // Serialiser Date → ISO så formen matcher store-ens SessionSummary, og
  // klient-flaten kan hydreres uten flash før load() tar over.
  const initialSessions: SessionSummary[] = sessions.map((s) => ({
    ...s,
    startedAt: s.startedAt.toISOString(),
    closedAt: s.closedAt ? s.closedAt.toISOString() : null,
  }));

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 font-sans max-w-3xl">
      <SectionLabel className="mb-3">Historikk</SectionLabel>
      <h1 className="text-[32px] md:text-[40px] leading-none tracking-[-0.03em] font-medium mb-2">
        Sesjoner
      </h1>
      <p className="text-[13px] text-ink/60 mb-8">
        Start, gi nytt navn, avslutt og gjenåpne søkerunder. Dette er kontrollrommet
        for sesjonene dine.
      </p>

      <ShareLinkWidget />

      <SessionHistoryClient initialSessions={initialSessions} />
    </div>
  );
}
