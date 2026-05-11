"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  useCollabStore,
  type CollabResourceKind,
} from "@/store/useCollabStore";

type SuggestionsByResource = Array<{
  resourceKind: CollabResourceKind;
  resourceId: string;
  count: number;
}>;

/**
 * Global bjelle-ikon for eier. Viser totalt antall pending forslag på
 * tvers av CV, brev og søknader. Klikk hopper til ressursen med flest.
 * Polls /api/collab/invite (med _count.suggestions) hvert 30. sek.
 */
const POLL_INTERVAL_MS = 30_000;

export function PendingSuggestionsBell() {
  const setInvites = useCollabStore((s) => s.setInvites);
  const setPending = useCollabStore((s) => s.setPending);
  const invites = useCollabStore((s) => s.invites);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/collab/invite", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          invites: Array<{
            id: string;
            token: string;
            resourceKind: CollabResourceKind;
            resourceId: string;
            label: string | null;
            expiresAt: string | null;
            createdAt: string;
            activeSessions: number;
            pendingSuggestions: number;
          }>;
        };
        if (cancelled) return;
        setInvites(data.invites);

        // Aggreger pending per ressurs så bell-counter kan summe dem opp
        // uten å vente på editor-side poll.
        const byResource = new Map<string, { kind: CollabResourceKind; id: string; count: number }>();
        for (const inv of data.invites) {
          const key = `${inv.resourceKind}:${inv.resourceId}`;
          const cur = byResource.get(key);
          if (cur) {
            cur.count += inv.pendingSuggestions;
          } else {
            byResource.set(key, {
              kind: inv.resourceKind,
              id: inv.resourceId,
              count: inv.pendingSuggestions,
            });
          }
        }
        // Sett tomme placeholder-arrays slik at totalPendingCount kan
        // summe — editor-bridge oppdaterer faktisk innhold når den
        // monteres på den siden.
        for (const { kind, id, count } of byResource.values()) {
          const existing = useCollabStore.getState().pendingByResource[`${kind}:${id}`];
          if (!existing || existing.length !== count) {
            // Fyll med dummy-placeholders så totalPendingCount-summen
            // stemmer. Editor-bridge replacer dem med ekte data på
            // ressurs-siden.
            const placeholder = Array(count).fill(null).map((_, i) => ({
              id: `__placeholder_${i}`,
              fieldPath: "",
              beforeValue: null,
              afterValue: null,
              authorName: "",
              createdAt: "",
            }));
            setPending(kind, id, placeholder);
          }
        }
      } catch {
        // ignore
      }
    }

    tick();
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [setInvites, setPending]);

  const total = useCollabStore((s) => s.totalPendingCount());

  if (total === 0) return null;

  // Finn ressursen med flest pending for click-target.
  const topResource = [...invites]
    .sort((a, b) => b.pendingSuggestions - a.pendingSuggestions)[0];
  const href = topResource
    ? topResource.resourceKind === "cv"
      ? "/app/cv"
      : topResource.resourceKind === "letter"
        ? `/app/brev/${topResource.resourceId}`
        : `/app/pipeline/${topResource.resourceId}`
    : "/app";

  return (
    <Link
      href={href}
      title={`${total} ventende forslag`}
      className="relative inline-flex items-center justify-center size-9 rounded-full hover:bg-black/5 transition-colors"
    >
      <Bell size={16} className="text-ink/70" />
      <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
        {total > 99 ? "99+" : total}
      </span>
    </Link>
  );
}
