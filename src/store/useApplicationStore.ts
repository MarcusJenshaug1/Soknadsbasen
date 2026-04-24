import { create } from "zustand";

/* ─── Types (mirrors Prisma output shape) ─────────────────── */

export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_META: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  draft:     { label: "Utkast",          color: "text-neutral-600", bg: "bg-neutral-100", icon: "PenLine" },
  applied:   { label: "Søkt",            color: "text-blue-700",    bg: "bg-blue-50",     icon: "Send" },
  interview: { label: "Intervju",        color: "text-purple-700",  bg: "bg-purple-50",   icon: "Mic" },
  offer:     { label: "Tilbud mottatt",  color: "text-emerald-700", bg: "bg-emerald-50",  icon: "PartyPopper" },
  accepted:  { label: "Akseptert",       color: "text-green-700",   bg: "bg-green-50",    icon: "CheckCircle2" },
  rejected:  { label: "Avslått",         color: "text-red-700",     bg: "bg-red-50",      icon: "XCircle" },
  withdrawn: { label: "Trukket",         color: "text-neutral-500", bg: "bg-neutral-50",  icon: "Ban" },
};

export interface AppTask {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  priority: string;
  dueAt: string | null;
  completedAt: string | null;
  type: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppActivity {
  id: string;
  applicationId: string;
  type: string;
  note: string | null;
  occurredAt: string;
}

export interface AppCompany {
  id: string;
  name: string;
  website: string | null;
}

export interface JobApplicationData {
  id: string;
  userId: string;
  companyId: string | null;
  sessionId: string | null;
  companyName: string;
  title: string;
  source: string | null;
  jobUrl: string | null;
  status: string;
  statusNote: string | null;
  statusUpdatedAt: string;
  applicationDate: string | null;
  deadlineAt: string | null;
  interviewAt: string | null;
  followUpAt: string | null;
  offerSalary: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  jobDescription: string | null;
  notes: string | null;
  resumeSnapshotId: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: AppTask[];
  activities: AppActivity[];
  company: AppCompany | null;
}

export type CreateApplicationInput = {
  companyName: string;
  title: string;
  status?: string;
  source?: string;
  jobUrl?: string;
  deadlineAt?: string;
  applicationDate?: string;
  notes?: string;
  jobDescription?: string;
  companyId?: string;
  resumeSnapshotId?: string;
};

export type UpdateApplicationInput = Partial<
  Omit<CreateApplicationInput, "companyName" | "title"> & {
    companyName: string;
    title: string;
    statusNote: string;
    interviewAt: string | null;
    followUpAt: string | null;
    offerSalary: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
  }
>;

/* ─── Store state ─────────────────────────────────────────── */

interface ApplicationStore {
  applications: JobApplicationData[];
  isLoading: boolean;
  error: string | null;

  /** Load (or reload) all applications from the server. */
  load: (params?: { status?: string; search?: string; sessionId?: string }) => Promise<void>;

  /** Create a new application, add it to local state, return it. */
  create: (input: CreateApplicationInput) => Promise<JobApplicationData>;

  /** Patch an existing application, refresh local state from server response. */
  update: (id: string, patch: UpdateApplicationInput) => Promise<void>;

  /** Delete an application and remove it from local state. */
  remove: (id: string) => Promise<void>;

  /** Fetch a single application and merge into state (useful after detail-view edits). */
  refresh: (id: string) => Promise<void>;
}

/* ─── Store implementation ────────────────────────────────── */

export const useApplicationStore = create<ApplicationStore>((set, get) => ({
  applications: [],
  isLoading: false,
  error: null,

  load: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const qs = new URLSearchParams();
      if (params?.status) qs.set("status", params.status);
      if (params?.search) qs.set("search", params.search);
      if (params?.sessionId) qs.set("sessionId", params.sessionId);
      const url = `/api/applications${qs.toString() ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Kunne ikke laste søknader");
      const data: JobApplicationData[] = await res.json();
      set({ applications: data });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Ukjent feil" });
    } finally {
      set({ isLoading: false });
    }
  },

  create: async (input) => {
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke opprette søknad");
    }
    const created: JobApplicationData = await res.json();
    set((s) => ({ applications: [created, ...s.applications] }));
    return created;
  },

  update: async (id, patch) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke oppdatere søknad");
    }
    const updated: JobApplicationData = await res.json();
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? updated : a)),
    }));
  },

  remove: async (id) => {
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke slette søknad");
    }
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }));
  },

  refresh: async (id) => {
    const res = await fetch(`/api/applications/${id}`);
    if (!res.ok) return;
    const updated: JobApplicationData = await res.json();
    set((s) => ({
      applications: s.applications.some((a) => a.id === id)
        ? s.applications.map((a) => (a.id === id ? updated : a))
        : [updated, ...s.applications],
    }));
  },
}));
