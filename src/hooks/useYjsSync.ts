"use client";

/**
 * Yjs-basert collab-sync. Erstatter useCloudSync for /app/cv når
 * NEXT_PUBLIC_HOCUSPOCUS_URL er satt. Hvis ikke faller appen tilbake
 * til useCloudSync (Supabase Realtime Broadcast-baserte sync).
 *
 * Arkitektur:
 *  - HocuspocusProvider åpner WebSocket til collab.soknadsbasen.no
 *  - Y.Doc er sannhet under aktiv collab-session
 *  - Lokale Zustand-endringer → Y.Doc via applyResumeToYDoc
 *  - Y.Doc remote-endringer → Zustand via yDocToResumePayload
 *  - Server (Hocuspocus) persisterer Y.Doc binary + JSON-snapshot
 *    debounced 2 sek
 *  - Awareness brukes for cursors + fokus-highlighting (erstatter
 *    Supabase Presence)
 */

import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useCloudSyncStore } from "@/store/useCloudSyncStore";
import {
  applyResumeToYDoc,
  yDocToResumePayload,
  type ResumePayloadV2,
} from "@/lib/yjs/mapper";

const CLIENT_ID = `cli-${Math.random().toString(36).slice(2, 10)}`;

// Hindrer save-loop: når vi applyer Y.Doc → Zustand via observer,
// vil Zustand-subscribe fyre debouncedBroadcast i useCloudSync hvis
// begge er montert. Vi setter flagget for å skille remote-apply fra
// brukerens lokale endringer.
let isApplyingFromYjs = false;

export function useYjsSync({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const impersonatedBy = useAuthStore((s) => s.impersonatedBy);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    const hocuspocusUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
    if (!enabled || !user?.id || !hocuspocusUrl) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session) return;

      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      const provider = new HocuspocusProvider({
        url: hocuspocusUrl,
        name: `cv:${user.id}`,
        document: ydoc,
        token: session.access_token,
        onSynced: () => {
          if (cancelled) return;
          // Y.Doc har lastet fra server — hydrer Zustand én gang.
          // Hvis dokumentet var tomt (ny bruker), Y.Doc har ikke noe;
          // i så fall lar vi useCloudSync sin /api/user/data-fetch ta
          // initial-load. Her sjekker vi om Y.Doc har innhold først.
          const meta = ydoc.getMap("meta");
          if (meta.get("activeResumeId")) {
            const payload = yDocToResumePayload(ydoc);
            isApplyingFromYjs = true;
            try {
              useResumeStore.setState({
                resumes: payload.resumes,
                activeResumeId: payload.activeResumeId,
                _resumeDataMap: payload._resumeDataMap,
                data: payload.data,
                isLoaded: true,
              });
            } finally {
              isApplyingFromYjs = false;
            }
          } else {
            // Tom Y.Doc — seed fra eksisterende Zustand-state (som
            // useCloudSync sannsynligvis allerede har hydrert fra REST).
            const current = useResumeStore.getState();
            if (current.isLoaded) {
              const payload: ResumePayloadV2 = {
                resumes: current.resumes,
                activeResumeId: current.activeResumeId,
                _resumeDataMap: {
                  ...current._resumeDataMap,
                  [current.activeResumeId]: current.data,
                },
                data: current.data,
              };
              applyResumeToYDoc(ydoc, payload);
            }
          }
          useCloudSyncStore.getState().setStatus("idle");
        },
        onStatus: ({ status }) => {
          if (status === "connected") {
            useCloudSyncStore.getState().setStatus("idle");
          } else if (status === "disconnected") {
            useCloudSyncStore.getState().setStatus("error");
            useCloudSyncStore.getState().setLastError("disconnected");
          }
        },
      });

      providerRef.current = provider;

      // Awareness: kringkast vår identitet + step + fokus til alle
      // andre klienter på samme dokument. Erstatter Supabase Presence.
      const identity = impersonatedBy ?? user;
      provider.awareness?.setLocalStateField("user", {
        clientId: CLIENT_ID,
        userId: user.id,
        email: identity.email,
        name: identity.name,
        avatarUrl: identity.avatarUrl ?? null,
        impersonating: !!impersonatedBy,
        joinedAt: Date.now(),
      });

      // Y.Doc-endringer fra remote → Zustand. Bruker observeDeep så
      // alle nested Y.Map/Y.Array/Y.Text-endringer fanges.
      const observer = (events: Array<Y.YEvent<Y.AbstractType<unknown>>>) => {
        // Vi vil ikke applye våre EGNE endringer tilbake (de gikk allerede
        // fra Zustand → Y.Doc). Yjs har transaction.origin som vi bruker
        // til å skille lokale fra remote endringer.
        const allLocal = events.every(
          (e) => e.transaction.origin === "local",
        );
        if (allLocal) return;

        const payload = yDocToResumePayload(ydoc);
        isApplyingFromYjs = true;
        try {
          // Beskytt feltet bruker har fokus på akkurat nå — IKKE
          // overskriv mens de skriver.
          const focusedEl = document.activeElement as HTMLElement | null;
          const focusedFieldId =
            focusedEl?.getAttribute("data-cv-field") ?? null;

          const currentData = useResumeStore.getState().data;
          const merged = focusedFieldId
            ? preserveFocusedField(currentData, payload.data, focusedFieldId)
            : payload.data;

          useResumeStore.setState({
            resumes: payload.resumes,
            activeResumeId: payload.activeResumeId,
            _resumeDataMap: {
              ...payload._resumeDataMap,
              [payload.activeResumeId]: merged,
            },
            data: merged,
          });
        } finally {
          isApplyingFromYjs = false;
        }
      };

      ydoc.getMap("active").observeDeep(observer);
      ydoc.getMap("meta").observeDeep(observer);

      // Lokale Zustand-endringer → Y.Doc.
      const unsubResume = useResumeStore.subscribe((state, prev) => {
        if (isApplyingFromYjs) return;
        if (state === prev) return;
        // Bare push hvis CV-data faktisk endret seg (ikke isLoaded etc.)
        if (
          state.data === prev.data &&
          state.activeResumeId === prev.activeResumeId &&
          state.resumes === prev.resumes &&
          state._resumeDataMap === prev._resumeDataMap
        ) {
          return;
        }
        const payload: ResumePayloadV2 = {
          resumes: state.resumes,
          activeResumeId: state.activeResumeId,
          _resumeDataMap: {
            ...state._resumeDataMap,
            [state.activeResumeId]: state.data,
          },
          data: state.data,
        };
        ydoc.transact(() => {
          applyResumeToYDoc(ydoc, payload);
        }, "local");
      });

      // Cleanup
      return () => {
        unsubResume();
        ydoc.getMap("active").unobserveDeep(observer);
        ydoc.getMap("meta").unobserveDeep(observer);
        provider.destroy();
        ydoc.destroy();
        providerRef.current = null;
        ydocRef.current = null;
      };
    })();

    return () => {
      cancelled = true;
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
      providerRef.current = null;
      ydocRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user?.id, impersonatedBy?.id]);
}

/**
 * Speilbilde av `mergeKeepingFocusedField` i useCloudSync. Tar
 * incoming-state og bytter ut feltet brukeren har fokus på med
 * den nåværende lokale verdien.
 */
function preserveFocusedField(
  current: import("@/store/useResumeStore").ResumeData,
  incoming: import("@/store/useResumeStore").ResumeData,
  fieldId: string,
): import("@/store/useResumeStore").ResumeData {
  const parts = fieldId.split(".");
  if (parts.length !== 2) return incoming;
  const [section, key] = parts;
  const cur = current as unknown as Record<string, unknown>;
  const inc = incoming as unknown as Record<string, unknown>;
  if (!(section in inc) || !(section in cur)) return incoming;
  const curSec = cur[section];
  const incSec = inc[section];
  if (
    typeof curSec !== "object" ||
    curSec === null ||
    typeof incSec !== "object" ||
    incSec === null
  ) {
    return incoming;
  }
  const mergedSection = {
    ...(incSec as Record<string, unknown>),
    [key]: (curSec as Record<string, unknown>)[key],
  };
  return {
    ...incoming,
    [section]: mergedSection,
  } as import("@/store/useResumeStore").ResumeData;
}
