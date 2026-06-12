"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { applyResumeSuggestion } from "@/lib/cv-suggestions";
import { SuggestionCard } from "./SuggestionCard";

/**
 * Eier-innboks for collab-forslag. Lister pending CollabSuggestion for en
 * ressurs og lar eier godta/avslå.
 *
 * Ved accept anvendes endringen klient-side i den levende CV-storen via de
 * vanlige store-actionene (samme vei som eierens egne redigeringer), som
 * propagerer til Y.Doc (useYjsSync) eller Supabase (useCloudSync). Først når
 * applyen lyktes kaller vi /resolve for å markere forslaget som godtatt — er
 * feltet slettet/flyttet bort, markeres det aldri, og eier får beskjed.
 *
 * For CV er resourceId = eierens user.id (samme konvensjon som InviteButton).
 */

type SuggestionStatus = "pending" | "accepted" | "rejected";

type SuggestionRow = {
  id: string;
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  authorName: string | null;
  status: SuggestionStatus;
  createdAt: string;
};

export function SuggestionsInbox({
  resourceId,
  onCountChange,
}: {
  resourceId: string;
  /** Rapporterer antall pending tilbake til knappen sin teller. */
  onCountChange?: (count: number) => void;
}) {
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/collab/suggest?resourceKind=cv&resourceId=${encodeURIComponent(resourceId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { suggestions: SuggestionRow[] };
      const pending = data.suggestions.filter((s) => s.status === "pending");
      setSuggestions(pending);
      onCountChange?.(pending.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente forslag");
    } finally {
      setLoading(false);
    }
  }, [resourceId, onCountChange]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  async function resolve(id: string, action: "accept" | "reject") {
    setResolvingId(id);
    setError(null);

    const target = suggestions.find((s) => s.id === id);

    // Ved accept: anvend endringen i den levende CV-storen FØR vi markerer
    // forslaget. Feiler applyen (feltet er slettet/flyttet), avbryter vi —
    // forslaget skal aldri stå som godtatt uten å ha hatt effekt.
    let appliedAccept = false;
    if (action === "accept") {
      if (!target) {
        setError("Forslaget finnes ikke lenger");
        setResolvingId(null);
        return;
      }
      appliedAccept = applyResumeSuggestion(target.fieldPath, target.afterValue);
      if (!appliedAccept) {
        setError(
          "Feltet finnes ikke lenger i CV-en, så forslaget kan ikke brukes. Avslå det for å rydde opp.",
        );
        setResolvingId(null);
        return;
      }
    }

    try {
      const res = await fetch(`/api/collab/suggest/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? `HTTP ${res.status}`);
      }
      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        onCountChange?.(next.length);
        return next;
      });
    } catch (e) {
      // Rull tilbake klient-applyen hvis server-markeringen feilet — ellers
      // beholder CV-en en endring som aldri ble godtatt server-side, mens
      // forslaget fortsatt står som pending.
      if (appliedAccept && target) {
        applyResumeSuggestion(target.fieldPath, target.beforeValue);
      }
      setError(e instanceof Error ? e.message : "Kunne ikke behandle forslaget");
    } finally {
      setResolvingId(null);
    }
  }

  if (loading && suggestions.length === 0) {
    return (
      <p className="px-6 py-8 text-[12px] text-ink/45">Laster forslag …</p>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="px-6 py-12 flex flex-col items-center justify-center text-center gap-3">
        <span className="size-12 rounded-full bg-panel flex items-center justify-center text-ink/40">
          <Inbox size={20} />
        </span>
        <p className="text-[13px] text-ink/55">Ingen ventende forslag.</p>
        {error && <p className="text-[12px] text-accent">{error}</p>}
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-4">
      {error && <p className="text-[12px] text-accent">{error}</p>}
      <ul className="space-y-3">
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.id}
            fieldPath={s.fieldPath}
            beforeValue={s.beforeValue}
            afterValue={s.afterValue}
            authorLabel={`${s.authorName?.trim() || "En hjelper"} foreslår`}
            busy={resolvingId === s.id}
            onAccept={() => resolve(s.id, "accept")}
            onReject={() => resolve(s.id, "reject")}
          />
        ))}
      </ul>
    </div>
  );
}
