"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FaktureringPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch(`/api/org/${slug}/portal`, { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg p-6 md:p-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/org/${slug}`} className="text-[13px] text-ink/50 hover:text-ink transition-colors">
          ← Tilbake
        </Link>
      </div>
      <h1 className="text-[22px] font-semibold mb-2">Fakturering</h1>
      <p className="text-[13px] text-ink/50 mb-8">
        Administrer abonnement, oppdater betalingsmetode og se fakturaer.
      </p>
      <button
        onClick={openPortal}
        disabled={loading}
        className="px-6 py-3 rounded-full bg-ink text-bg text-[14px] font-medium disabled:opacity-40 transition-opacity"
      >
        {loading ? "Åpner…" : "Åpne faktureringportal →"}
      </button>
    </div>
  );
}
