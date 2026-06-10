"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, ExternalLink, FileText } from "lucide-react";

type Props = {
  slug: string;
  isLoggedIn: boolean;
  initialSavedId: string | null;
  applyUrl: string | null;
  employerName: string;
};

export function JobActions({
  slug,
  isLoggedIn,
  initialSavedId,
  applyUrl,
  employerName,
}: Props) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Tidligere window.focus-listener pinget /api/jobb/.../save på hver
  // alt-tab. Lite verdi (sjelden lagrer man fra annen tab samtidig), mye
  // støy. Fjernet — bruker kan refreshe manuelt om de trenger sync.

  async function toggleSave() {
    if (!isLoggedIn) {
      router.push(
        `/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}`)}`,
      );
      return;
    }
    setError(null);
    if (savedId) {
      const prev = savedId;
      setSavedId(null);
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "DELETE" });
      if (!res.ok) {
        setSavedId(prev);
        const data = await res.json().catch(() => ({}));
        setError(data?.reason ?? "Kunne ikke fjerne fra lagrede");
      }
    } else {
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "POST" });
      if (!res.ok) {
        setError("Kunne ikke lagre");
        return;
      }
      const data = await res.json();
      setSavedId(data.id);
    }
  }

  async function createAndOpen() {
    if (!isLoggedIn) {
      router.push(
        `/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}?action=create`)}`,
      );
      return;
    }
    setError(null);
    setCreating(true);
    try {
      let id = savedId;
      if (!id) {
        const res = await fetch(`/api/jobb/${slug}/save`, { method: "POST" });
        if (!res.ok) throw new Error("save failed");
        const data = await res.json();
        id = data.id;
        setSavedId(id);
      }
      startTransition(() => {
        router.push(`/app/pipeline/${id}`);
      });
    } catch {
      setError("Kunne ikke opprette søknad");
    } finally {
      setCreating(false);
    }
  }

  const busy = creating || pending;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={createAndOpen}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium outline-none hover:bg-[#a94424] active:bg-[#8f3a1e] disabled:opacity-60 disabled:cursor-wait focus-visible:ring-2 focus-visible:ring-[#D5592E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f5] transition-colors"
        >
          <FileText className={`size-4 ${busy ? "animate-pulse" : ""}`} aria-hidden />
          {busy ? "Åpner …" : "Lag søknad i Søknadsbasen"}
        </button>

        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Søk hos ${employerName}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 rounded-full border border-black/15 text-[14px] whitespace-nowrap outline-none hover:border-[#14110e]/30 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#D5592E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f5] transition-colors"
          >
            Søk hos arbeidsgiver
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}

        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={Boolean(savedId)}
          aria-label={savedId ? "Fjern fra lagrede" : "Lagre stilling"}
          className={`inline-flex min-h-12 items-center justify-center gap-2 px-5 py-3 rounded-full border text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#D5592E]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f5] transition-colors ${
            savedId
              ? "border-[#D5592E]/30 bg-[#D5592E]/8 text-[#D5592E] hover:bg-[#D5592E]/12"
              : "border-black/15 text-[#14110e]/75 hover:border-[#14110e]/30 hover:bg-black/5"
          }`}
        >
          {savedId ? (
            <BookmarkCheck className="size-4" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )}
          {savedId ? "Lagret" : "Lagre"}
        </button>
      </div>

      {savedId && (
        <p className="text-[12px] text-[#14110e]/60">
          Lagt til som kladd i din pipeline.{" "}
          <Link
            href={`/app/pipeline/${savedId}`}
            className="rounded text-[#D5592E] underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[#D5592E]/50"
          >
            Åpne søknaden →
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
