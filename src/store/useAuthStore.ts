import { create } from "zustand";
import { supabaseBrowser } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  /** Fetch the current session from Supabase. */
  fetchSession: () => Promise<void>;

  /** Register a new account via Supabase Auth. */
  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string }>;

  /** Log in via Supabase Auth. */
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;

  /** Log out. */
  logout: () => Promise<void>;
}

function toAuthUser(
  supaUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null,
): AuthUser | null {
  if (!supaUser) return null;
  const metadataName =
    typeof supaUser.user_metadata?.name === "string"
      ? (supaUser.user_metadata.name as string)
      : null;
  return {
    id: supaUser.id,
    email: supaUser.email ?? "",
    name: metadataName,
  };
}

export const useAuthStore = create<AuthStore>((set) => {
  // Keep the browser client fresh across listener and call sites.
  const supabase = supabaseBrowser();

  // React to sign-in / sign-out / token-refresh events globally.
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: toAuthUser(session?.user ?? null), loading: false });
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
        set({ user: toAuthUser(data.user), loading: false });
      } catch {
        set({ user: null, loading: false });
      }
    },

    register: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) {
        return { ok: false, error: "Registrering feilet." };
      }
      set({ user: toAuthUser(data.user) });
      return { ok: true };
    },

    login: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { ok: false, error: error.message };
      set({ user: toAuthUser(data.user) });
      return { ok: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null });
    },
  };
});
