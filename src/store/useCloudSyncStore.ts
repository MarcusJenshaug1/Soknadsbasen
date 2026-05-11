import { create } from "zustand";

/**
 * Cloud-sync status. Holdes ADSKILT fra useResumeStore for å unngå at
 * isSaving/lastSavedAt-oppdateringer trigger nye save-loops via subscribe.
 *
 * Hentes av ResumeEditor for å vise "Lagrer…" / "Lagret X sek siden".
 */

export type SyncStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface CloudSyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  lastError: string | null;
  setStatus: (status: SyncStatus) => void;
  setLastSavedAt: (ts: number | null) => void;
  setLastError: (msg: string | null) => void;
}

export const useCloudSyncStore = create<CloudSyncState>((set) => ({
  status: "idle",
  lastSavedAt: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setLastSavedAt: (ts) => set({ lastSavedAt: ts }),
  setLastError: (msg) => set({ lastError: msg }),
}));
