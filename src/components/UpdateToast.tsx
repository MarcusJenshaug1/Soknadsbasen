"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const POLL_MS = 60_000;
const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export function UpdateToast() {
  const [outdated, setOutdated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkVersion = useCallback(async () => {
    if (typeof CURRENT_BUILD !== "string" || CURRENT_BUILD.startsWith("dev")) {
      return;
    }
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { version?: string };
      if (data.version && data.version !== CURRENT_BUILD) {
        setOutdated(true);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (CURRENT_BUILD.startsWith("dev")) return;

    const start = () => {
      stop();
      void checkVersion();
      timerRef.current = setInterval(() => {
        if (document.visibilityState === "visible") void checkVersion();
      }, POLL_MS);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkVersion();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkVersion]);

  if (!outdated || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[60] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6 px-3 max-w-[calc(100vw-1.5rem)]"
    >
      <div className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-full bg-ink text-bg shadow-2xl border border-white/10">
        <RefreshCw className="size-4 shrink-0 text-accent" />
        <div className="flex flex-col leading-tight min-w-0">
          <span className="text-[13px] font-medium">
            Ny versjon tilgjengelig
          </span>
          <span className="text-[11px] text-bg/60 hidden sm:block">
            Last inn på nytt for å bruke siste versjon.
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ml-1 px-3 py-1.5 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors whitespace-nowrap"
        >
          Last inn
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Lukk"
          className="size-8 inline-flex items-center justify-center rounded-full text-bg/60 hover:text-bg hover:bg-white/10 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
