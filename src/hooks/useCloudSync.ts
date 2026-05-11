"use client";

/**
 * Cloud sync hook — keeps Zustand stores in sync with the server
 * when the user is logged in.
 *
 * Strategy:
 *  - On login / session restore → fetch from server, overwrite local state
 *  - On every store change → debounced save to server
 *  - On logout → (optional) clear local data or keep as cache
 */

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useResumeStore } from "@/store/useResumeStore";
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
  /** Diagnostikk-felter fra serveren — brukes til mismatch-warning. */
  debug?: {
    sessionUserId?: string;
    sessionEmail?: string;
    impTargetId?: string | null;
    impAdminId?: string | null;
  };
}

/* ─── Constants ───────────────────────────────────────────── */

const SAVE_DEBOUNCE_MS = 2_000; // Wait 2s after last change before saving

/* ─── Module-level suspend flag ───────────────────────────── */

// Sett til true før impersonation start/stop hard-nav for å hindre at
// admins (eller targets) in-memory CV-state lekker inn i feil UserData-rad
// via beforeunload-sendBeacon eller en pending debounced save.
let suspended = false;
export function suspendCloudSync() {
  suspended = true;
}

/* ─── Helpers ─────────────────────────────────────────────── */

function extractCvEmail(
  resumeData: ResumePayloadV2 | ResumePayloadV1 | null | undefined,
): string | null {
  if (!resumeData) return null;
  // v2 multi-CV payload
  if ("resumes" in resumeData && resumeData.resumes?.length) {
    const active = resumeData._resumeDataMap?.[resumeData.activeResumeId];
    const email = active?.contact?.email ?? resumeData.data?.contact?.email;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  }
  // v1
  if ("data" in resumeData && resumeData.data) {
    const email = resumeData.data.contact?.email;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  }
  return null;
}

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
        if (!res.ok) return;
        const data: ServerData = await res.json();

        // Sjekk om server-data tilhører den brukeren vi tror er innlogget.
        // Hvis mismatch (f.eks. impersonation-cookie tapt, eller target's
        // UserData-rad ble korrumpert), IKKE setState — det ville skrevet
        // feil bruker sin CV inn i editoren.
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

        // Sjekk om CV-en i raden tilhører serverens session-bruker. Hvis
        // contact.email ≠ session-email betyr det at raden er korrumpert
        // av tidligere impersonation-bug. Loggfør og hopp over hydrering.
        const cvEmail = extractCvEmail(data.resumeData);
        if (serverEmail && cvEmail && cvEmail !== serverEmail) {
          console.warn(
            "[CloudSync] CV-data tilhører feil bruker, hopper over hydrering.",
            { sessionEmail: serverEmail, cvEmail, debug: data.debug },
          );
          useResumeStore.getState().setLoaded(true);
          loadedRef.current = true;
          return;
        }

        if (data.resumeData) {
          const rd = data.resumeData;
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
        }

        useResumeStore.getState().setLoaded(true);
        loadedRef.current = true;
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

    try {
      const rs = useResumeStore.getState();
      const resumeData: ResumePayloadV2 = {
        resumes: rs.resumes,
        activeResumeId: rs.activeResumeId,
        _resumeDataMap: { ...rs._resumeDataMap, [rs.activeResumeId]: rs.data },
        data: rs.data,
      };

      await fetch("/api/user/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeData }),
      });
    } catch (err) {
      console.error("[CloudSync] Failed to save:", err);
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  /* ── Debounced save ────────────────────────────────────── */
  const debouncedSave = useCallback(() => {
    if (suspended) return;
    if (!loadedRef.current) return; // Don't save before initial load
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
  }, [user]);
}
