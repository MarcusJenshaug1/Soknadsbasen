import { create } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  /** Fetch the current session from Supabase + enrich with Prisma profile. */
  fetchSession: () => Promise<void>;
  /** Re-read the profile row (name/avatar). Call after editing profile. */
  refreshProfile: () => Promise<void>;

  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

async function fetchProfile(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/api/user/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: AuthUser };
    return data.user;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const supabase = supabaseBrowser();

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
      set({ user: null, loading: false });
      return;
    }
    // Only refetch profile when the session meaningfully changes — skip
    // TOKEN_REFRESHED so we don't hammer the server on every tab focus.
    if (event === "TOKEN_REFRESHED" && get().user?.id === session.user.id) {
      return;
    }
    const profile = await fetchProfile();
    set({
      user:
        profile ?? {
          id: session.user.id,
          email: session.user.email ?? "",
          name:
            (session.user.user_metadata?.name as string | undefined) ?? null,
          avatarUrl: null,
        },
      loading: false,
    });
  });

  return {
    user: null,
    loading: true,

    setUser: (user) => set({ user }),
    setLoading: (loading) => set({ loading }),

    fetchSession: async () => {
      try {
        set({ loading: true });
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          set({ user: null, loading: false });
          return;
        }
        const profile = await fetchProfile();
        set({
          user:
            profile ?? {
              id: data.user.id,
              email: data.user.email ?? "",
              name:
                (data.user.user_metadata?.name as string | undefined) ?? null,
              avatarUrl: null,
            },
          loading: false,
        });
      } catch {
        set({ user: null, loading: false });
      }
    },

    refreshProfile: async () => {
      const profile = await fetchProfile();
      if (profile) set({ user: profile });
    },

    register: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "Registrering feilet." };
      set({
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
          name,
          avatarUrl: null,
        },
      });
      return { ok: true };
    },

    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      const profile = await fetchProfile();
      set({
        user:
          profile ?? {
            id: data.user.id,
            email: data.user.email ?? email,
            name:
              (data.user.user_metadata?.name as string | undefined) ?? null,
            avatarUrl: null,
          },
      });
      return { ok: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null });
    },
  };
});
