"use client";

import { useEffect } from "react";
import {
  useCollabStore,
  type PendingSuggestion,
} from "@/store/useCollabStore";
import { InlineSuggestionBadge } from "./InlineSuggestionBadge";

/**
 * Mountes i eier-editor (ResumeEditor, BrevEditor, ApplicationDetail).
 * Polls REST hvert 5. sek for pending forslag og oppdaterer
 * useCollabStore. Renderer også InlineSuggestionBadge så badge-en
 * vises automatisk når forslag dukker opp.
 *
 * Når Hocuspocus-integrasjonen er på plass (Fase 1.4) erstattes pollet
 * av en Y.Doc-observer på `ydoc.getMap("suggestions")` — broadcast-basert
 * push, sub-100ms latens. Frem til da er pollet "godt nok".
 */
const POLL_INTERVAL_MS = 5_000;

export function OwnerCollabBridge({
  resourceKind,
  resourceId,
}: {
  resourceKind: "cv" | "letter" | "application";
  resourceId: string;
}) {
  const setPending = useCollabStore((s) => s.setPending);

  useEffect(() => {
    let cancelled = false;

    async function fetchPending() {
      try {
        const res = await fetch(
          `/api/collab/suggest?resourceKind=${resourceKind}&resourceId=${encodeURIComponent(resourceId)}&status=pending`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          suggestions: PendingSuggestion[];
        };
        if (cancelled) return;
        setPending(resourceKind, resourceId, data.suggestions);
      } catch {
        // ignore — neste tick prøver igjen
      }
    }

    fetchPending();
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      fetchPending();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [resourceKind, resourceId, setPending]);

  return <InlineSuggestionBadge resourceKind={resourceKind} resourceId={resourceId} />;
}
