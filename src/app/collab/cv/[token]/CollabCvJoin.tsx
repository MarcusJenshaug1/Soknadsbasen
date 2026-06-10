"use client";

import { useEffect, useState } from "react";
import { JoinNameModal } from "@/components/collab/JoinNameModal";
import { KickedModal } from "@/components/collab/KickedModal";
import { AnonResumeEditor } from "./AnonResumeEditor";

type JoinResponse = {
  jwt: string;
  sessionId: string;
  inviteId: string;
  resourceKind: "cv";
  resourceId: string;
  ownerLabel: string | null;
};

/**
 * Collab CV-join + (placeholder for nå) anon-editor mount.
 *
 * Når Hocuspocus-deploy er live (Fase 1.4): mounter
 * `<AnonResumeEditor jwt resourceId />` her som bruker useYjsSync med
 * suggester-role. Frem til da viser vi en "Venter på collab-server"-side
 * etter join — RESTen funker og forslag kan testes med Postman.
 */
export function CollabCvJoin({
  token,
  label,
  ownerDisplayName,
}: {
  token: string;
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
        const payload = (await res.json().catch(() => ({}))) as {
          error?: { code?: string; message?: string } | string;
        };
        if (res.status === 404 || res.status === 410) {
          setKicked(true);
          return;
        }
        // Støtt både ny ({ code, message }) og gammel (string) error-shape.
        const msg =
          typeof payload.error === "string"
            ? payload.error
            : payload.error?.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as JoinResponse;
      setJoin(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke koble til");
    }
  }

  // Auto-join hvis navnet allerede ligger i localStorage.
  useEffect(() => {
    if (join || kicked || error) return;
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("collab-display-name");
      if (stored && stored.trim().length > 0) {
        handleJoin(stored.trim());
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (kicked) {
    return <KickedModal ownerDisplayName={ownerDisplayName} />;
  }

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
        preview={{
          resourceKind: "cv",
          ownerDisplayName,
          label,
        }}
        onSubmit={handleJoin}
      />
    );
  }

  // Etter join: mount medhjelper-visningen — read-only CV-snapshot + forslag.
  return (
    <AnonResumeEditor jwt={join.jwt} ownerDisplayName={ownerDisplayName} />
  );
}
