import { create } from "zustand";

/**
 * Owner-side collab-state: pending forslag + aktive sesjoner per ressurs.
 * Suggester-side bruker den IKKE — de har bare sin egen lokale draft-state
 * og kaller POST /api/collab/suggest.
 *
 * Pending suggestions polles fra REST hvert ~5 sek hvis Hocuspocus ikke
 * pusher dem via Y.Doc's suggestions-map (Hocuspocus-integrasjonen kommer
 * i Fase 1.4 etter Hetzner-deploy). Frem til da brukes REST-polling som
 * datakilde.
 */

export type CollabResourceKind = "cv" | "letter" | "application";

export interface PendingSuggestion {
  id: string;
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  authorName: string;
  createdAt: string;
}

export interface ActiveCollabSession {
  id: string;
  displayName: string;
  connectedAt: string;
  lastSeenAt: string;
}

export interface CollabInviteSummary {
  id: string;
  token: string;
  resourceKind: CollabResourceKind;
  resourceId: string;
  label: string | null;
  expiresAt: string | null;
  createdAt: string;
  activeSessions: number;
  pendingSuggestions: number;
}

interface CollabState {
  /** Pending forslag per ressurs (key: `${kind}:${resourceId}`). */
  pendingByResource: Record<string, PendingSuggestion[]>;
  /** Aktive sesjoner per invite. Hentes on-demand av eier-UI. */
  sessionsByInvite: Record<string, ActiveCollabSession[]>;
  /** Eiers liste over invitasjoner (alle ressurser). */
  invites: CollabInviteSummary[];

  setPending: (kind: CollabResourceKind, resourceId: string, items: PendingSuggestion[]) => void;
  removePending: (kind: CollabResourceKind, resourceId: string, suggestionId: string) => void;
  setSessions: (inviteId: string, items: ActiveCollabSession[]) => void;
  setInvites: (items: CollabInviteSummary[]) => void;

  /** Totalt antall pending på tvers av alle ressurser. Brukes av bell-ikon. */
  totalPendingCount: () => number;
}

function key(kind: CollabResourceKind, resourceId: string): string {
  return `${kind}:${resourceId}`;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  pendingByResource: {},
  sessionsByInvite: {},
  invites: [],

  setPending: (kind, resourceId, items) =>
    set((s) => ({
      pendingByResource: { ...s.pendingByResource, [key(kind, resourceId)]: items },
    })),

  removePending: (kind, resourceId, suggestionId) =>
    set((s) => {
      const k = key(kind, resourceId);
      const list = s.pendingByResource[k] ?? [];
      return {
        pendingByResource: {
          ...s.pendingByResource,
          [k]: list.filter((p) => p.id !== suggestionId),
        },
      };
    }),

  setSessions: (inviteId, items) =>
    set((s) => ({
      sessionsByInvite: { ...s.sessionsByInvite, [inviteId]: items },
    })),

  setInvites: (items) => set({ invites: items }),

  totalPendingCount: () => {
    const map = get().pendingByResource;
    let total = 0;
    for (const list of Object.values(map)) total += list.length;
    return total;
  },
}));

export function getResourceKey(kind: CollabResourceKind, resourceId: string): string {
  return key(kind, resourceId);
}
