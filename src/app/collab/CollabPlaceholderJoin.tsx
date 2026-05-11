"use client";

import { useEffect, useState } from "react";
import { JoinNameModal } from "@/components/collab/JoinNameModal";
import { KickedModal } from "@/components/collab/KickedModal";
import type { CollabResourceKind } from "@/lib/collabToken";

type JoinResponse = {
  jwt: string;
  sessionId: string;
  inviteId: string;
  resourceKind: CollabResourceKind;
  resourceId: string;
  ownerLabel: string | null;
};

/**
 * Felles join-flyt for /collab/letter/[token] og /collab/application/[token].
 * For CV brukes `CollabCvJoin` direkte siden CV-anon-editoren skal være
 * den første som får faktisk Yjs-tilkobling. Letter + application får
 * tilsvarende editor-mount når mapperne er på plass.
 */
export function CollabPlaceholderJoin({
  token,
  resourceKind,
  label,
  ownerDisplayName,
}: {
  token: string;
  resourceKind: CollabResourceKind;
  label: string | null;
  ownerDisplayName: string;
}) {
  const [join, setJoin] = useState<JoinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);

  async function handleJoin(name: string) {
    try {
      const res = await fetch("/api/collab/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, displayName: name }),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) {
          setKicked(true);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as JoinResponse;
      setJoin(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke koble til");
    }
  }

  useEffect(() => {
    if (join || kicked || error) return;
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("collab-display-name");
      if (stored && stored.trim().length > 0) handleJoin(stored.trim());
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (kicked) return <KickedModal ownerDisplayName={ownerDisplayName} />;

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-[20px] font-medium mb-2">Klarte ikke å koble til</h1>
          <p className="text-[13px] text-ink/65 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setJoin(null);
            }}
            className="px-5 py-2.5 rounded-full bg-ink text-bg text-[13px] font-medium"
          >
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  if (!join) {
    return (
      <JoinNameModal
        preview={{ resourceKind, ownerDisplayName, label }}
        onSubmit={handleJoin}
      />
    );
  }

  const resourceLabel =
    resourceKind === "letter" ? "søknadsbrevet" : "søknaden";

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div className="max-w-lg">
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
          Koblet til
        </div>
        <h1 className="text-[22px] font-medium tracking-tight mb-3">
          Velkommen!
        </h1>
        <p className="text-[14px] text-ink/65 leading-[1.55] mb-3">
          Du er nå koblet til {ownerDisplayName} sitt {resourceLabel}.
        </p>
        <p className="text-[13px] text-ink/55 leading-[1.55] mb-6">
          Live-editor for {resourceLabel} mountes når collab-serveren er aktiv
          (Fase 2 av prosjektet). REST-laget er klart, så du kan teste å sende
          forslag direkte mot <code>/api/collab/suggest</code> hvis du vil.
        </p>
        <p className="text-[11px] text-ink/40">
          Sesjon-id: <code>{join.sessionId.slice(0, 8)}…</code>
        </p>
      </div>
    </div>
  );
}
