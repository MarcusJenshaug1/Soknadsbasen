"use client";

/**
 * Cloud sync hook — keeps Zustand stores in sync with the server
 * when the user is logged in.
 *
 * Strategi:
 *  - Init: hent /api/user/data, hydrer store
 *  - Auto-save: debounced 500ms etter hver lokal endring
 *  - Live collab: Supabase Realtime Broadcast på channel cv:<userId>.
 *    Etter en vellykket save kringkaster vi `cv-updated`. Andre klienter
 *    på samme userId fanger event-en og refetcher umiddelbart. Sub-100ms.
 *  - Fallback: slow poll (30s) hvis broadcast-channel skulle dø.
 *  - beforeunload: sendBeacon for last-chance save.
 *
 * Status (saving/saved/error) lever i useCloudSyncStore for å ikke trigge
 * subscribe-loop tilbake til selve CV-stateen.
 */

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
import { useCloudSyncStore } from "@/store/useCloudSyncStore";
import type { ResumeData, ResumeEntry } from "@/store/useResumeStore";

/* ─── Types ───────────────────────────────────────────────── */

interface ResumePayloadV2 {
  resumes: ResumeEntry[];
  activeResumeId: string;
  _resumeDataMap: Record<string, ResumeData>;
  data: ResumeData;
}

interface ResumePayloadV1 {
  data: ResumeData;
}

interface ServerData {
  resumeData: ResumePayloadV2 | ResumePayloadV1 | null;
  debug?: { sessionEmail?: string };
}

/* ─── Constants ───────────────────────────────────────────── */

const SAVE_DEBOUNCE_MS = 500;
// Fallback-polling 30 sek hvis realtime-broadcast dør. Hovedsynk skjer via broadcast.
const POLL_INTERVAL_MS = 30_000;
// Klient-id sendt med broadcast så vi kan ignorere våre egne ekko.
const CLIENT_ID = `cli-${Math.random().toString(36).slice(2, 10)}`;

/* ─── Module-level flags ──────────────────────────────────── */

let suspended = false;
export function suspendCloudSync() {
  suspended = true;
}

// True mens loadFromServer kaller setState. Forhindrer at den nylig
// hentede serverdataen umiddelbart blir re-savet (subscribe → debounced
// save). Dekker BÅDE resumeData-setState og setLoaded-setState.
let isHydrating = false;

/* ─── The hook ────────────────────────────────────────────── */

export function useCloudSync({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /* ── Fetch data from server and hydrate stores ─────────── */
  const loadFromServer = useCallback(
    async (expectedEmail: string | null) => {
      try {
        const res = await fetch("/api/user/data", { cache: "no-store" });
        if (!res.ok) {
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }
        const data: ServerData = await res.json();

        // Session-email-mismatch (klient vs server) er fortsatt en defense.
        const serverEmail = data.debug?.sessionEmail ?? null;
        if (expectedEmail && serverEmail && expectedEmail !== serverEmail) {
          console.warn("[CloudSync] Session-email mismatch.", {
            expected: expectedEmail,
            server: serverEmail,
          });
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }

        // Bruker startet å skrive mens vi fetchet — IKKE overskriv lokale endringer.
        const statusAfter = useCloudSyncStore.getState().status;
        if (statusAfter === "dirty" || statusAfter === "saving") {
          if (!loadedRef.current) {
            useResumeStore.getState().setLoaded(true);
            loadedRef.current = true;
          }
          return;
        }

        // Hele hydrerings-blokken er inne i isHydrating så ALLE setState her
        // (inkl. setLoaded) skipper subscribe → debouncedSave.
        isHydrating = true;
        try {
          if (data.resumeData) {
            const rd = data.resumeData;
            if ("resumes" in rd && rd.resumes?.length) {
              useResumeStore.setState({
                resumes: rd.resumes,
                activeResumeId: rd.activeResumeId,
                _resumeDataMap: rd._resumeDataMap,
                data: rd._resumeDataMap[rd.activeResumeId] ?? rd.data,
              });
            } else if ("data" in rd && rd.data) {
              const id = "resume-default";
              useResumeStore.setState({
                resumes: [{ id, name: "Min CV", createdAt: new Date().toISOString() }],
                activeResumeId: id,
                _resumeDataMap: { [id]: rd.data },
                data: rd.data,
              });
            }
          }
          if (!useResumeStore.getState().isLoaded) {
            useResumeStore.getState().setLoaded(true);
          }
        } finally {
          isHydrating = false;
        }
        loadedRef.current = true;

        // Status: bare gå til "idle"/"saved" hvis ikke bruker startet skriving
        // (status="dirty") i akkurat samme microtask. setStatus selv trigger
        // ikke subscribe i useResumeStore.
        const currentStatus = useCloudSyncStore.getState().status;
        if (currentStatus !== "dirty" && currentStatus !== "saving") {
          useCloudSyncStore.getState().setStatus("idle");
        }
      } catch (err) {
        console.error("[CloudSync] Failed to load:", err);
        useResumeStore.getState().setLoaded(true);
        loadedRef.current = true;
      }
    },
    [],
  );

  /* ── Save current state to server ──────────────────────── */
  const saveToServer = useCallback(async () => {
    if (suspended) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    const sync = useCloudSyncStore.getState();
    sync.setStatus("saving");
    sync.setLastError(null);

    try {
      const rs = useResumeStore.getState();
      const resumeData: ResumePayloadV2 = {
        resumes: rs.resumes,
        activeResumeId: rs.activeResumeId,
        _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
        data: rs.data,
      };

      const res = await fetch("/api/user/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const code = payload?.error?.code ?? `http_${res.status}`;
        useCloudSyncStore.getState().setLastError(code);
        useCloudSyncStore.getState().setStatus("error");
        console.warn("[CloudSync] Save failed:", code, payload);
        return;
      }

      useCloudSyncStore.getState().setLastSavedAt(Date.now());
      useCloudSyncStore.getState().setStatus("saved");

      // Kringkast til andre klienter på samme userId at CV-en er oppdatert.
      // self: false i config gjør at vi ikke får vårt eget ekko.
      const ch = channelRef.current;
      if (ch) {
        try {
          await ch.send({
            type: "broadcast",
            event: "cv-updated",
            payload: { from: CLIENT_ID, at: Date.now() },
          });
        } catch (err) {
          // Broadcast feilet — vi har fortsatt lagret til DB, så ingen kritisk feil.
          // Polling fanger opp om broadcast forsvinner.
          console.debug("[CloudSync] Broadcast failed (non-fatal):", err);
        }
      }
    } catch (err) {
      console.error("[CloudSync] Failed to save:", err);
      useCloudSyncStore.getState().setLastError(
        err instanceof Error ? err.message : "network",
      );
      useCloudSyncStore.getState().setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  /* ── Debounced save ────────────────────────────────────── */
  const debouncedSave = useCallback(() => {
    if (suspended) return;
    if (isHydrating) return;
    if (!loadedRef.current) return;
    useCloudSyncStore.getState().setStatus("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToServer, SAVE_DEBOUNCE_MS);
  }, [saveToServer]);

  /* ── Load on login ─────────────────────────────────────── */
  useEffect(() => {
    if (!enabled) return;
    if (user) {
      loadFromServer(user.email ?? null);
    } else {
      loadedRef.current = false;
      useResumeStore.getState().setLoaded(false);
    }
  }, [enabled, user, loadFromServer]);

  /* ── Subscribe to store changes → auto-save ────────────── */
  useEffect(() => {
    if (!enabled || !user) return;
    const unsubResume = useResumeStore.subscribe(debouncedSave);
    return () => unsubResume();
  }, [enabled, user, debouncedSave]);

  /* ── Supabase Realtime Broadcast for live collab ───────── */
  useEffect(() => {
    if (!enabled || !user?.id) return;

    const supabase = supabaseBrowser();
    const channel = supabase.channel(`cv:${user.id}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "cv-updated" }, (msg) => {
        const from = (msg.payload as { from?: string } | undefined)?.from;
        if (from === CLIENT_ID) return; // eget ekko, hopp over
        // Skip refetch hvis bruker skriver — loadFromServer har sin egen
        // dirty-guard, så dette er bare for å kutte unødvendig fetch.
        const status = useCloudSyncStore.getState().status;
        if (status === "dirty" || status === "saving") return;
        loadFromServer(user.email ?? null);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, user?.email, loadFromServer]);

  /* ── Fallback polling 30s hvis broadcast skulle dø ───────── */
  useEffect(() => {
    if (!enabled || !user) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const status = useCloudSyncStore.getState().status;
      if (status === "dirty" || status === "saving") return;
      loadFromServer(user.email ?? null);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enabled, user, loadFromServer]);

  /* ── Save immediately before page unload ───────────────── */
  useEffect(() => {
    if (!enabled || !user) return;

    const handleBeforeUnload = () => {
      if (suspended) return;
      if (!loadedRef.current) return;
      const rs = useResumeStore.getState();
      const resumeData: ResumePayloadV2 = {
        resumes: rs.resumes,
        activeResumeId: rs.activeResumeId,
        _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
        data: rs.data,
      };
      navigator.sendBeacon(
        "/api/user/data",
        new Blob([JSON.stringify({ resumeData })], { type: "application/json" }),
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, user]);
}
