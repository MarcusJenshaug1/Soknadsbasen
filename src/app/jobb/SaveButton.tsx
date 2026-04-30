"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";

type Props = {
  slug: string;
  isLoggedIn: boolean;
  initialSaved: boolean;
};

export function SaveButton({ slug, isLoggedIn, initialSaved }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push(
        `/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}`)}`,
      );
      return;
    }
    if (busy) return;
    setBusy(true);
    if (saved) {
      const prev = saved;
      setSaved(false);
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "DELETE" });
      if (!res.ok) setSaved(prev);
    } else {
      setSaved(true);
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "POST" });
      if (!res.ok) setSaved(false);
    }
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Fjern fra lagrede" : "Lagre stilling"}
      className={`relative inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
        saved
          ? "border-[#D5592E]/30 bg-[#D5592E]/10 text-[#D5592E] hover:bg-[#D5592E]/15"
          : "border-black/10 bg-white text-[#14110e]/55 hover:border-[#14110e]/30 hover:text-[#14110e]"
      } ${busy ? "opacity-60" : ""}`}
    >
      {saved ? (
        <BookmarkCheck className="size-4" aria-hidden />
      ) : (
        <Bookmark className="size-4" aria-hidden />
      )}
    </button>
  );
}
