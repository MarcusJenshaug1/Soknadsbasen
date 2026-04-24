"use client";

import Link from "next/link";
import { useSessionStore } from "@/store/useSessionStore";

interface Props {
  sessionId: string;
}

export function SessionBanner({ sessionId }: Props) {
  const sessions = useSessionStore((s) => s.sessions);
  const session = sessions.find((s) => s.id === sessionId);

  if (!session) return null;

  const start = new Date(session.startedAt).toLocaleDateString("nb-NO", {
    day: "numeric", month: "short", year: "numeric",
  });
  const end = session.closedAt
    ? new Date(session.closedAt).toLocaleDateString("nb-NO", {
        day: "numeric", month: "short", year: "numeric",
      })
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
