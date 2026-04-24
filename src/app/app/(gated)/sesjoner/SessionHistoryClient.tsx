"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/useSessionStore";

export function SessionHistoryClient({ sessionId }: { sessionId: string }) {
  const reopen = useSessionStore((s) => s.reopen);
  const activeSession = useSessionStore((s) => s.activeSession);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (activeSession) return null;

  async function handleReopen() {
    setLoading(true);
    setError(null);
    try {
      await reopen(sessionId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleReopen}
        disabled={loading}
        className="px-3 py-1.5 rounded-full text-[12px] border border-black/10 dark:border-white/10 hover:border-black/25 dark:hover:border-white/25 transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "Gjenåpne"}
      </button>
      {error && <div className="text-[11px] text-accent mt-1">{error}</div>}
    </div>
  );
}
