"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { markJobSeen } from "@/lib/jobs/actions";

/**
 * Sett-status: innloggede skriver JobSeen via server action (fire-and-forget);
 * anonyme bruker localStorage (LRU ~500). Dimming for anonyme settes post-
 * mount (kort flash akseptert — unngår hydration-mismatch).
 */
const LS_KEY = "sb:jobb:sett";
const LS_MAX = 500;

function readSeenMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();

function writeSeen(slug: string) {
  try {
    const map = readSeenMap();
    map[slug] = Date.now();
    const entries = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, LS_MAX);
    localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)));
    listeners.forEach((l) => l());
  } catch {
    // private mode / full storage: sett-status er ikke kritisk
  }
}

export function isSeenLocally(slug: string): boolean {
  try {
    return slug in readSeenMap();
  } catch {
    return false;
  }
}

/** localStorage som external store — dimming uten setState-i-effect. */
function useSeenLocally(slug: string, enabled: boolean): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    listeners.add(onChange);
    window.addEventListener("storage", onChange);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => enabled && isSeenLocally(slug),
    () => false,
  );
}

/** Wrapper rundt kortet: klikk markerer som sett, anonym dimming post-mount. */
export function SeenCardWrapper({
  jobId,
  slug,
  loggedIn,
  seenOnServer,
  children,
}: {
  jobId: string;
  slug: string;
  loggedIn: boolean;
  seenOnServer: boolean;
  children: React.ReactNode;
}) {
  const seenLocally = useSeenLocally(slug, !loggedIn);
  const seen = loggedIn ? seenOnServer : seenLocally;

  return (
    <div
      data-seen={seen || undefined}
      className="data-[seen]:opacity-70"
      onClickCapture={() => {
        if (loggedIn) void markJobSeen(jobId);
        else writeSeen(slug);
      }}
    >
      {children}
    </div>
  );
}

/** Direktelast av detalj/hurtigvisning markerer også som sett. */
export function SeenOnMount({ jobId, slug }: { jobId: string; slug: string }) {
  useEffect(() => {
    writeSeen(slug);
    // Server action er no-op for anonyme.
    void markJobSeen(jobId);
  }, [jobId, slug]);
  return null;
}
