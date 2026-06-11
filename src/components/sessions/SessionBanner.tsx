import Link from "next/link";

/**
 * "Arkiv"-banner som vises når brukeren ser på en historisk (ikke-aktiv) sesjon.
 * Presentasjonell: sesjonen mates inn fra server-komponenten som rendrer siden.
 * Tidligere leste den useSessionStore.sessions, men den lista hydreres ikke på
 * alle ruter (f.eks. /app/selskaper), så banneret ble usynlig der.
 */
interface BannerSession {
  name: string;
  startedAt: Date | string;
  closedAt: Date | string | null;
  _count: { applications: number };
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

export function SessionBanner({ session }: { session: BannerSession }) {
  const start = new Date(session.startedAt).toLocaleDateString("nb-NO", DATE_OPTS);
  const end = session.closedAt
    ? new Date(session.closedAt).toLocaleDateString("nb-NO", DATE_OPTS)
    : null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 mb-4 text-[12px]">
      <div className="text-amber-800">
        <span className="font-medium">Arkiv:</span>{" "}
        {session.name}
        <span className="text-amber-600 ml-1">
          · {start}{end ? ` – ${end}` : ""}
          {" "}· {session._count.applications} søknader
        </span>
      </div>
      <Link
        href="/app/pipeline"
        className="shrink-0 px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors whitespace-nowrap"
      >
        Tilbake til aktiv sesjon
      </Link>
    </div>
  );
}
