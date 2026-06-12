"use client";

/**
 * Yjs-basert collab-sync. Erstatter useCloudSync for /app/cv når
 * NEXT_PUBLIC_HOCUSPOCUS_URL er satt. Uten URL faller appen tilbake
 * til Supabase Realtime Broadcast (useCloudSync).
 *
 * VIKTIG: yjs (~50KB), @hocuspocus/provider (~10KB) og mapperen
 * lastes via dynamic imports inne i useEffect, IKKE som top-level
 * imports. Det betyr at klienter UTEN Hocuspocus-URL aldri laster
 * ned koden — kommer ut som egne Next.js-chunks som code-splittes
 * automatisk.
 *
 * Arkitektur (når aktiv):
 *  - HocuspocusProvider åpner WebSocket til collab.soknadsbasen.no
 *  - Y.Doc er sannhet under aktiv collab-session
 *  - Lokale Zustand-endringer → Y.Doc via applyResumeToYDoc
 *  - Y.Doc remote-endringer → Zustand via yDocToResumePayload
 *  - Server (Hocuspocus) persisterer Y.Doc binary + JSON-snapshot
 *    debounced 2 sek
 *  - Awareness brukes for cursors + fokus-highlighting
 */

import { useEffect, useRef } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useCloudSyncStore } from "@/store/useCloudSyncStore";

// Type-only imports — strippes ved build, drar ikke inn kode.
import type * as YjsTypes from "yjs";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import type { ResumeData } from "@/store/useResumeStore";
import type { ResumePayloadV2 } from "@/lib/yjs/mapper";

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
  const ydocRef = useRef<YjsTypes.Doc | null>(null);

  useEffect(() => {
    const hocuspocusUrl = process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;
    if (!enabled || !user?.id || !hocuspocusUrl) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      // Dynamic imports — yjs/hocuspocus/mapper lastes KUN her, ikke ved
      // initial bundle. Next.js gjør code-splitting automatisk.
      const [yjsMod, providerMod, mapperMod, supabase] = await Promise.all([
        import("yjs"),
        import("@hocuspocus/provider"),
        import("@/lib/yjs/mapper"),
        Promise.resolve(supabaseBrowser()),
      ]);
      if (cancelled) return;

      const Y = yjsMod;
      const { HocuspocusProvider } = providerMod;
      const { applyResumeToYDoc, yDocToResumePayload } = mapperMod;

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
            // Tom Y.Doc = brukeren har ingen persistert CV: serveren seeder
            // doc-en fra UserData.resumeData når den finnes, så hit kommer vi
            // kun for helt ny konto eller rett etter Nullstill (som sletter
            // cv_yjs_state og tømmer resumeData). Seed fra Zustand-state
            // (default tom CV hvis ikke hydrert) og marker lastet — uten
            // setLoaded står /app/cv evig på «Laster CV-data».
            const current = useResumeStore.getState();
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
            if (!current.isLoaded) {
              useResumeStore.getState().setLoaded(true);
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

      // Awareness: kringkast identitet til alle andre klienter.
      // Erstatter Supabase Presence-laget vi har i useCloudSync.
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

      // Y.Doc-endringer fra remote → Zustand.
      const observer = (
        events: Array<YjsTypes.YEvent<YjsTypes.AbstractType<unknown>>>,
      ) => {
        const allLocal = events.every(
          (e) => e.transaction.origin === "local",
        );
        if (allLocal) return;

        const payload = yDocToResumePayload(ydoc);
        isApplyingFromYjs = true;
        try {
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

      cleanup = () => {
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
      cleanup?.();
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
  current: ResumeData,
  incoming: ResumeData,
  fieldId: string,
): ResumeData {
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
  } as ResumeData;
}
