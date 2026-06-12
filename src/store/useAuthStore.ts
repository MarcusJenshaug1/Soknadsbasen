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
  /** Sett når admin impersonerer en bruker. Inneholder admins faktiske
   * identitet (mens `user` er target). Null ellers. */
  impersonatedBy: AuthUser | null;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  setImpersonatedBy: (admin: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;

  /** Fetch the current session from Supabase + enrich with Prisma profile. */
  fetchSession: () => Promise<void>;
  /** Re-read the profile row (name/avatar). Call after editing profile. */
  refreshProfile: () => Promise<void>;

  register: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

type ProfileResponse = { user: AuthUser; impersonatedBy: AuthUser | null };

async function fetchProfile(): Promise<ProfileResponse | null> {
  try {
    const res = await fetch("/api/user/profile", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as ProfileResponse;
    return data;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const supabase = supabaseBrowser();

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session?.user) {
      set({ user: null, impersonatedBy: null, loading: false });
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
        profile?.user ?? {
          id: session.user.id,
          email: session.user.email ?? "",
          name:
            (session.user.user_metadata?.name as string | undefined) ?? null,
          avatarUrl: null,
        },
      impersonatedBy: profile?.impersonatedBy ?? null,
      loading: false,
    });
  });

  return {
    user: null,
    impersonatedBy: null,
    loading: true,

    setUser: (user) => set({ user }),
    setImpersonatedBy: (impersonatedBy) => set({ impersonatedBy }),
    setLoading: (loading) => set({ loading }),

    fetchSession: async () => {
      try {
        set({ loading: true });
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          set({ user: null, impersonatedBy: null, loading: false });
          return;
        }
        const profile = await fetchProfile();
        set({
          user:
            profile?.user ?? {
              id: data.user.id,
              email: data.user.email ?? "",
              name:
                (data.user.user_metadata?.name as string | undefined) ?? null,
              avatarUrl: null,
            },
          impersonatedBy: profile?.impersonatedBy ?? null,
          loading: false,
        });
      } catch {
        set({ user: null, impersonatedBy: null, loading: false });
      }
    },

    refreshProfile: async () => {
      const profile = await fetchProfile();
      if (profile) {
        set({
          user: profile.user,
          impersonatedBy: profile.impersonatedBy,
        });
      }
    },

    register: async (email, password, name) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          // Bekreftelseslenken lander på auto-innloggings-siden, som
          // etablerer sesjonen klient-side og sender videre til /velkommen.
          emailRedirectTo: `${window.location.origin}/bekreftet`,
        },
      });
      if (error) return { ok: false, error: error.message };
      if (!data.user) return { ok: false, error: "Registrering feilet." };
      // Uten session krever Supabase e-postbekreftelse — IKKE sett user i
      // storen da (appen ville trodd man var innlogget og bouncet via
      // /velkommen → /logg-inn uten forklaring).
      if (!data.session) {
        return { ok: true, needsConfirmation: true };
      }
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
          profile?.user ?? {
            id: data.user.id,
            email: data.user.email ?? email,
            name:
              (data.user.user_metadata?.name as string | undefined) ?? null,
            avatarUrl: null,
          },
        impersonatedBy: profile?.impersonatedBy ?? null,
      });
      return { ok: true };
    },

    logout: async () => {
      await supabase.auth.signOut();
      set({ user: null, impersonatedBy: null });
    },
  };
});
