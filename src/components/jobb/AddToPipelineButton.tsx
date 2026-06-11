"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheck, FiPlus } from "react-icons/fi";

/**
 * «Legg til i pipeline» på kortet (designreferansen): skjult til hover/fokus
 * på desktop, alltid synlig på touch (lg:opacity-0 + group-hover). Gjenbruker
 * /api/jobb/[slug]/save-flyten. z-10 løfter den over kortets stretched link.
 */
export function AddToPipelineButton({
  slug,
  loggedIn,
}: {
  slug: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}`)}`);
      return;
    }
    if (saved || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "POST" });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={busy}
      aria-label={saved ? "Lagt til i pipeline" : "Legg til i pipeline"}
      className={`relative z-10 mt-0.5 flex h-[30px] items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium outline-none transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent/50 ${
        saved
          ? "border-ink bg-ink text-bg"
          : "border-border bg-surface text-ink-soft hover:border-ink hover:text-ink lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
      }`}
    >
      {saved ? <FiCheck size={12} aria-hidden /> : <FiPlus size={12} aria-hidden />}
      {saved ? "I pipeline" : "Legg til"}
    </button>
  );
}
