import { create } from "zustand";

export interface SessionSummary {
  id: string;
  name: string;
  status: "ACTIVE" | "CLOSED";
  outcome: "GOT_JOB" | "PAUSE" | "OTHER" | null;
  startedAt: string;
  closedAt: string | null;
  notes: string | null;
  _count: { applications: number };
}

export interface CloseSessionInput {
  outcome: "GOT_JOB" | "PAUSE" | "OTHER";
  winningApplicationId?: string;
  notes?: string;
}

interface SessionStore {
  activeSession: SessionSummary | null;
  sessions: SessionSummary[];
  isLoading: boolean;

  load: () => Promise<void>;
  create: (input: { name?: string; notes?: string }) => Promise<SessionSummary>;
  close: (id: string, input: CloseSessionInput) => Promise<void>;
  reopen: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSession: null,
  sessions: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("Kunne ikke laste sesjoner");
      const data: SessionSummary[] = await res.json();
      set({
        sessions: data,
        activeSession: data.find((s) => s.status === "ACTIVE") ?? null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  create: async (input) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke opprette sesjon");
    }
    const created: SessionSummary = await res.json();
    set((s) => ({
      sessions: [created, ...s.sessions],
      activeSession: created,
    }));
    return created;
  },

  close: async (id, input) => {
    const res = await fetch(`/api/sessions/${id}/close`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke avslutte sesjon");
    }
    const closed: SessionSummary = await res.json();
    set((s) => ({
      activeSession: null,
      sessions: s.sessions.map((sess) => (sess.id === id ? closed : sess)),
    }));
  },

  reopen: async (id) => {
    const res = await fetch(`/api/sessions/${id}/reopen`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke gjenåpne sesjon");
    }
    const reopened: SessionSummary = await res.json();
    set((s) => ({
      activeSession: reopened,
      sessions: s.sessions.map((sess) => (sess.id === id ? reopened : sess)),
    }));
  },

  rename: async (id, name) => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? "Kunne ikke gi nytt navn");
    }
    const updated: SessionSummary = await res.json();
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? updated : sess)),
      activeSession:
        s.activeSession?.id === id ? updated : s.activeSession,
    }));
  },
}));
