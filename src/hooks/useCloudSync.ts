"use client";

/**
 * Cloud sync hook — keeps Zustand stores in sync with the server
 * when the user is logged in.
 *
 * Strategy:
 *  - On login / session restore → fetch from server, overwrite local state
 *  - On every store change → debounced save to server (500ms = realtime feel)
 *  - On logout → clear loaded flag
 *  - beforeunload → sendBeacon for last-chance save
 *
 * Status (saving/saved/error) lever i useCloudSyncStore for å ikke trigge
 * subscribe-loop tilbake til selve CV-stateen.
 */

import { useEffect, useRef, useCallback } from "react";
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

// Server may still have v1 (single CV) payload
interface ResumePayloadV1 {
  data: ResumeData;
}

interface ServerData {
  resumeData: ResumePayloadV2 | ResumePayloadV1 | null;
  /**
   * Server-echo med sessionens faktiske email. Brukes som ground-truth
   * for å detektere cross-user CV-leak.
   */
  debug?: {
    sessionEmail?: string;
  };
}

/* ─── Constants ───────────────────────────────────────────── */

// 500ms gir realtime-følelse uten å hamre serveren ved kjapp typing.
// Marcus mistet arbeid med 2s debounce + nav-før-timer.
const SAVE_DEBOUNCE_MS = 500;

// Poll-intervall for "live" samarbeid: admin impersonerer + bruker er
// innlogget samtidig, begge ser hverandres edits innen ~3 sek. Hopper
// over polling når brukeren skriver (status=dirty/saving) for å unngå
// å overskrive ulagrede endringer. Hopper også over når faneblikket
// er skjult (sparer batteri/quota).
const POLL_INTERVAL_MS = 3_000;

/* ─── Module-level flags ──────────────────────────────────── */

// Sett til true før impersonation start/stop hard-nav for å hindre at
// admins (eller targets) in-memory CV-state lekker inn i feil UserData-rad
// via beforeunload-sendBeacon eller en pending debounced save.
let suspended = false;
export function suspendCloudSync() {
  suspended = true;
}

// True mens loadFromServer kaller setState. Forhindrer at den nylig
// hentede serverdataen umiddelbart blir re-savet (subscribe → debounced
// save). Settes synkront før setState, resettes etter.
let isHydrating = false;

/* ─── The hook ────────────────────────────────────────────── */

export function useCloudSync({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

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

        // Sjekk om server-sesjonen tilhører den brukeren vi tror er
        // innlogget. Hvis useAuthStore.user.email ≠ debug.sessionEmail er
        // klient-state usynkron med serveren (sjeldent, men kan skje rundt
        // impersonation-overganger). IKKE setState — det kan vise feil
        // bruker sin CV.
        const serverEmail = data.debug?.sessionEmail ?? null;
        if (expectedEmail && serverEmail && expectedEmail !== serverEmail) {
          console.warn(
            "[CloudSync] Session-email mismatch, hopper over hydrering.",
            { expected: expectedEmail, server: serverEmail, debug: data.debug },
          );
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }

        // Tidligere hadde vi også en sjekk på resumeData.contact.email vs
        // sessionEmail. Den ble fjernet fordi mange brukere har forskjellig
        // login-email og CV-kontakt-email (work vs. personal). Korrumperte
        // rader fra impersonation-bugen ryddes nå via /admin/cv-cleanup.

        // Sjekk status PÅ NYTT etter fetch (kan ha endret seg mens fetch
        // pågikk — bruker startet å skrive). Hvis dirty/saving, må vi
        // IKKE overskrive lokale endringer med server-data.
        const statusAfter = useCloudSyncStore.getState().status;
        if (statusAfter === "dirty" || statusAfter === "saving") {
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }

        if (data.resumeData) {
          const rd = data.resumeData;
          isHydrating = true;
          try {
            if ("resumes" in rd && rd.resumes?.length) {
              // v2 multi-CV payload
              useResumeStore.setState({
                resumes: rd.resumes,
                activeResumeId: rd.activeResumeId,
                _resumeDataMap: rd._resumeDataMap,
                data: rd._resumeDataMap[rd.activeResumeId] ?? rd.data,
              });
            } else if ("data" in rd && rd.data) {
              // v1 single-CV payload — wrap into multi-CV
              const id = "resume-default";
              useResumeStore.setState({
                resumes: [{ id, name: "Min CV", createdAt: new Date().toISOString() }],
                activeResumeId: id,
                _resumeDataMap: { [id]: rd.data },
                data: rd.data,
              });
            }
          } finally {
            isHydrating = false;
          }
        }

        useResumeStore.getState().setLoaded(true);
        loadedRef.current = true;
        // Etter hydrering er state nettopp lik server, så vi går tilbake
        // til "idle" (eller "saved" hvis vi har lastSavedAt). Status forblir
        // dirty/saving hvis bruker hadde ulagrede endringer — men vi nådde
        // ikke setState i så fall pga dirty-guarden i poll.
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
    if (isHydrating) return; // setState kom fra loadFromServer, ikke fra bruker
    if (!loadedRef.current) return; // Don't save before initial load
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

    return () => {
      unsubResume();
    };
  }, [enabled, user, debouncedSave]);

  /* ── Live polling: hent server-data jevnlig så admin+bruker ser
       hverandres edits. Hopper over når dirty/saving (ikke overskrive
       ulagrede endringer) og når fanen er skjult (batteri/quota). ─── */
  useEffect(() => {
    if (!enabled || !user) return;

    const intervalId = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const status = useCloudSyncStore.getState().status;
      // Bare poll når lokalt state er "rolig". Hvis bruker skriver
      // (dirty) eller save pågår (saving), vent til neste tick.
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

      // Use sendBeacon for reliable delivery during page close
      navigator.sendBeacon(
        "/api/user/data",
        new Blob(
          [JSON.stringify({ resumeData })],
          { type: "application/json" }
        )
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, user]);
}
