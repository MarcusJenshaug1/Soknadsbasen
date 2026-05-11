import { create } from "zustand";

/**
 * Cloud-sync status + presence. Holdes ADSKILT fra useResumeStore for å
 * unngå at isSaving/lastSavedAt-oppdateringer trigger nye save-loops via
 * subscribe.
 *
 * Hentes av ResumeEditor for å vise "Lagrer…", "Lagret X sek siden", og
 * hvilke andre brukere som er inne på samme CV (live presence).
 */

export type SyncStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type Collaborator = {
  /** Unik per nettleserfane. Brukes til å skille ekte deltakere fra eget ekko. */
  clientId: string;
  /** Supabase user-id. Admin under impersonering har target's id her. */
  userId: string;
  email: string;
  name: string | null;
  /** ResumeEditor.currentStep, 0-indeksert. Brukes til å vise "X redigerer Erfaring". */
  step: number;
  /** True hvis dette er admin som impersonerer (egen indikator i UI). */
  impersonating: boolean;
  joinedAt: number;
};

interface CloudSyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  lastError: string | null;
  /** Min egen ResumeEditor.currentStep, kringkastes til presence. */
  currentStep: number;
  /** Alle ANDRE klienter på samme cv-kanal. Min egen er filtrert ut. */
  collaborators: Collaborator[];
  setStatus: (status: SyncStatus) => void;
  setLastSavedAt: (ts: number | null) => void;
  setLastError: (msg: string | null) => void;
  setCurrentStep: (step: number) => void;
  setCollaborators: (list: Collaborator[]) => void;
}

export const useCloudSyncStore = create<CloudSyncState>((set) => ({
  status: "idle",
  lastSavedAt: null,
  lastError: null,
  currentStep: 0,
  collaborators: [],
  setStatus: (status) => set({ status }),
  setLastSavedAt: (ts) => set({ lastSavedAt: ts }),
  setLastError: (msg) => set({ lastError: msg }),
  setCurrentStep: (currentStep) => set({ currentStep }),
  setCollaborators: (collaborators) => set({ collaborators }),
}));
