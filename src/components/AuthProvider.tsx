"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCloudSync } from "@/hooks/useCloudSync";

/**
 * Place this in the root layout to fetch the current session on app load
 * and keep data synced with the server when logged in.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const fetchSession = useAuthStore((s) => s.fetchSession);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Cloud sync — loads data from server on login, auto-saves on changes
  useCloudSync();

  return <>{children}</>;
}
