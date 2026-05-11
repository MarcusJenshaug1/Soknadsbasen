"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

type Status = {
  active: boolean;
  adminEmail?: string | null;
  targetEmail?: string | null;
  targetName?: string | null;
};

export function ImpersonationBanner() {
  const [status, setStatus] = useState<Status | null>(null);
  const [stopping, setStopping] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/impersonate/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: Status) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ active: false }); });
    return () => { cancelled = true; };
  }, []);

  async function stop() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      // Hard nav for å nullstille all server-rendret cache som ser målbruker.
      window.location.href = "/admin/brukere";
    } catch {
      setStopping(false);
    }
  }

  if (!status?.active) return null;

  const targetLabel = status.targetName
    ? `${status.targetName} (${status.targetEmail})`
    : status.targetEmail;

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-[13px]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        <ShieldAlert size={16} className="shrink-0" />
        <span className="flex-1 min-w-0">
          Du ser Søknadsbasen som <strong>{targetLabel}</strong>
          <span className="opacity-80"> · admin: {status.adminEmail}</span>
        </span>
        <button
          onClick={stop}
          disabled={stopping}
          className="px-3 py-1 rounded-full bg-white text-red-700 text-[12px] font-semibold disabled:opacity-50"
        >
          {stopping ? "Stopper…" : "Stopp"}
        </button>
      </div>
    </div>
  );
}
