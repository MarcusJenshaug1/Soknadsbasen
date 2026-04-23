"use client";

import { useEffect } from "react";

/**
 * Swallows transient "Failed to fetch" errors that originate from Supabase's
 * background auth refresh. These are not actionable — the library retries —
 * but they surface as unhandled rejections and trigger the Next.js dev overlay.
 *
 * We only silence the exact shape (TypeError + "Failed to fetch" + stack
 * referencing @supabase/auth-js) so real network errors still surface.
 */
export function SupabaseErrorSilencer() {
  useEffect(() => {
    const shouldSwallow = (reason: unknown): boolean => {
      if (!(reason instanceof TypeError)) return false;
      if (reason.message !== "Failed to fetch") return false;
      const stack = reason.stack ?? "";
      return (
        stack.includes("@supabase/auth-js") ||
        stack.includes("supabase_auth-js")
      );
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (shouldSwallow(e.reason)) e.preventDefault();
    };
    const onError = (e: ErrorEvent) => {
      if (shouldSwallow(e.error)) e.preventDefault();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
