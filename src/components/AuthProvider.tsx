"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCloudSync } from "@/hooks/useCloudSync";
import { SupabaseErrorSilencer } from "./SupabaseErrorSilencer";

const AUTH_ROUTES = [
  "/logg-inn",
  "/registrer",
  "/glemt-passord",
  "/nytt-passord",
];

/**
 * Place this in the root layout to fetch the current session on app load
 * and keep data synced with the server when logged in.
 *
 * På auth-ruter skipper vi både fetchSession og useCloudSync. Bruker har
 * ikke session der, og unødvendig Supabase-kall + sync-hook gjør auth-sidene
 * merkbart tregere ved første hydrering.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname?.startsWith(r));
  const fetchSession = useAuthStore((s) => s.fetchSession);

  useEffect(() => {
    if (isAuthRoute) return;
    fetchSession();
  }, [fetchSession, isAuthRoute]);

  // Cloud sync — hopper over på auth-ruter siden ingen sesjon er aktiv.
  useCloudSync({ enabled: !isAuthRoute });

  return (
    <>
      <SupabaseErrorSilencer />
      {children}
    </>
  );
}
