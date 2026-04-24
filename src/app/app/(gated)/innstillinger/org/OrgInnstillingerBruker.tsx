"use client";

import { useState } from "react";
import type { OrgContext } from "@/lib/auth";

export function OrgInnstillingerBruker({ org }: { org: OrgContext }) {
  const [shares, setShares] = useState(org.sharesDataWithOrg);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/org/${org.slug}/members/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharesDataWithOrg: !shares }),
      });
      if (res.ok) {
        setShares((s) => !s);
        setMsg("Lagret");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/8 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium">Del data med {org.displayName}</div>
            <div className="text-[12px] text-ink/55 mt-1">
              Lar organisasjonens administrator se dine søknader og CVer.
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={saving}
            className={`shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
              shares ? "bg-ink" : "bg-black/15"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${
                shares ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {msg && <p className="text-[12px] text-green-700 mt-3">{msg}</p>}
      </div>

      <div className="rounded-2xl border border-black/8 p-5 space-y-2">
        <div className="text-[11px] uppercase tracking-wide text-ink/40 mb-3">Din tilknytning</div>
        <div className="flex justify-between text-[13px]">
          <span className="text-ink/60">Organisasjon</span>
          <span className="font-medium">{org.displayName}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-ink/60">Rolle</span>
          <span className="font-medium">{org.role === "admin" ? "Administrator" : "Medlem"}</span>
        </div>
      </div>

      {org.role === "admin" && (
        <a
          href={`/org/${org.slug}`}
          className="block text-center py-3 rounded-full border border-black/12 text-[14px] font-medium hover:bg-black/3 transition-colors"
        >
          Administrer organisasjon →
        </a>
      )}
    </div>
  );
}
