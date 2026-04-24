"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviterClient({ token, orgDisplayName }: { token: string; orgDisplayName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/inviter/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Noe gikk galt"); return; }
      router.push(`/org/${data.orgSlug}?joined=ok`);
    } catch {
      setError("Noe gikk galt");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <button
        onClick={accept}
        disabled={loading}
        className="w-full py-3 rounded-full bg-[#D5592E] text-white text-[14px] font-medium disabled:opacity-40 transition-opacity"
      >
        {loading ? "Godtar…" : `Bli med i ${orgDisplayName} →`}
      </button>
    </div>
  );
}
