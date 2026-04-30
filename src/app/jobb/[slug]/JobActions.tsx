"use client";

import { useEffect, useState, useTransition } from "react";
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

  // Re-sync server state on focus (in case user saved from another tab)
  useEffect(() => {
    function refresh() {
      if (!isLoggedIn) return;
      fetch(`/api/jobb/${slug}/save`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) setSavedId(d.id ?? null);
        })
        .catch(() => {});
    }
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [slug, isLoggedIn]);

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
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium hover:bg-[#a94424] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <FileText className="size-4" aria-hidden />
          {busy
            ? "Åpner …"
            : isLoggedIn
              ? "Lag søknad i Søknadsbasen"
              : "Lag søknad i Søknadsbasen"}
        </button>

        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-black/15 text-[14px] hover:border-[#14110e]/30 hover:bg-black/5 transition-colors"
          >
            Søk via {employerName}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}

        <button
          type="button"
          onClick={toggleSave}
          aria-pressed={Boolean(savedId)}
          aria-label={savedId ? "Fjern fra lagrede" : "Lagre stilling"}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border text-[14px] transition-colors ${
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
            className="text-[#D5592E] hover:underline"
          >
            Åpne søknaden →
          </Link>
        </p>
      )}
      {error && (
        <p className="text-[12px] text-red-600">{error}</p>
      )}
    </div>
  );
}
