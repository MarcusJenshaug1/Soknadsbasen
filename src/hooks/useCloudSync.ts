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
}

/* ─── Constants ───────────────────────────────────────────── */

const SAVE_DEBOUNCE_MS = 2_000; // Wait 2s after last change before saving

/* ─── The hook ────────────────────────────────────────────── */

export function useCloudSync({ enabled = true }: { enabled?: boolean } = {}) {
  const user = useAuthStore((s) => s.user);
  const loadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  /* ── Fetch data from server and hydrate stores ─────────── */
  const loadFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/user/data");
      if (!res.ok) return;
      const data: ServerData = await res.json();

      // Hydrate resume store if server has data
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

      loadedRef.current = true;
    } catch (err) {
      console.error("[CloudSync] Failed to load:", err);
    }
  }, []);

  /* ── Save current state to server ──────────────────────── */
  const saveToServer = useCallback(async () => {
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
    if (!loadedRef.current) return; // Don't save before initial load
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveToServer, SAVE_DEBOUNCE_MS);
  }, [saveToServer]);

  /* ── Load on login ─────────────────────────────────────── */
  useEffect(() => {
    if (!enabled) return;
    if (user) {
      loadFromServer();
    } else {
      loadedRef.current = false;
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
