"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { suspendCloudSync } from "@/hooks/useCloudSync";

/**
 * Rendres server-betinget fra app/org-layoutene (som allerede har
 * impersonasjons-konteksten via React.cache) i stedet for å fetche status
 * fra klienten på hver sidevisning for alle besøkende.
 */
export function ImpersonationBanner({
  adminEmail,
  targetEmail,
  targetName,
}: {
  adminEmail: string;
  targetEmail: string;
  targetName: string | null;
}) {
  const [stopping, setStopping] = useState(false);

  async function stop() {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      // Cookien er nå borte, så session.userId er admin igjen. Et pending
      // save eller beforeunload herfra ville skrevet target's in-memory CV
      // inn i ADMINS rad. Suspend før hard-nav.
      suspendCloudSync();
      window.location.href = "/admin/brukere";
    } catch {
      setStopping(false);
    }
  }

  const targetLabel = targetName ? `${targetName} (${targetEmail})` : targetEmail;

  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-[13px]">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 flex-wrap">
        <ShieldAlert size={16} className="shrink-0" />
        <span className="flex-1 min-w-0">
          Du ser Søknadsbasen som <strong>{targetLabel}</strong>
          <span className="opacity-80"> · admin: {adminEmail}</span>
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
