"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useYjsSync } from "@/hooks/useYjsSync";
import { clearLegacyResumeStorage } from "@/store/useResumeStore";
import { SupabaseErrorSilencer } from "./SupabaseErrorSilencer";

// Når NEXT_PUBLIC_HOCUSPOCUS_URL er satt går vi over til Yjs-basert
// collab (sub-100ms via WebSocket). Uten URL faller appen tilbake til
// Supabase Realtime Broadcast (current useCloudSync). Bytt env-variabel
// for å aktivere etter Hocuspocus er deployet på Hetzner.
const USE_YJS = !!process.env.NEXT_PUBLIC_HOCUSPOCUS_URL;

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

  // Ryd opp legacy localStorage-entry fra forrige persist-versjon.
  // Persist ble fjernet for å hindre CV-leak under impersonering.
  useEffect(() => {
    clearLegacyResumeStorage();
  }, []);

  // Sync — hopper over på auth-ruter siden ingen sesjon er aktiv.
  // Nøyaktig én sync-stack kjører om gangen. Når NEXT_PUBLIC_HOCUSPOCUS_URL
  // er satt overtar useYjsSync (WebSocket-basert CRDT, sub-100ms).
  // Persistens håndteres da av Hocuspocus-serveren i samme Postgres-rad,
  // så ikke-collab-konsumenter (PDF, AI, share) ikke merker noen forskjell.
  useCloudSync({ enabled: !isAuthRoute && !USE_YJS });
  useYjsSync({ enabled: !isAuthRoute && USE_YJS });

  return (
    <>
      <SupabaseErrorSilencer />
      {children}
    </>
  );
}
