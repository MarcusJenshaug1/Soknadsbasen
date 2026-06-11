"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiCheck,
  FiCopy,
  FiEdit3,
  FiExternalLink,
  FiPlus,
} from "react-icons/fi";

/**
 * CTA-raden (designreferansen): «Skriv søknadstekst» (primær, intern flyt),
 * «Søk på stillingen» (ekstern), pipeline-toggle og kopier lenke. Ordet «AI»
 * brukes bevisst ikke. Brukes av både full detaljside og hurtigvisningens
 * sticky footer.
 */
export function DetailCtas({
  slug,
  isLoggedIn,
  initialSavedId,
  applyUrl,
  employerName,
}: {
  slug: string;
  isLoggedIn: boolean;
  initialSavedId: string | null;
  applyUrl: string | null;
  employerName: string;
}) {
  const router = useRouter();
  const [savedId, setSavedId] = useState<string | null>(initialSavedId);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureSaved(): Promise<string> {
    if (savedId) return savedId;
    const res = await fetch(`/api/jobb/${slug}/save`, { method: "POST" });
    if (!res.ok) throw new Error("save failed");
    const data = (await res.json()) as { id: string };
    setSavedId(data.id);
    return data.id;
  }

  async function writeApplication() {
    if (!isLoggedIn) {
      router.push(`/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}?action=create`)}`);
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const id = await ensureSaved();
      startTransition(() => router.push(`/app/pipeline/${id}`));
    } catch {
      setError("Kunne ikke opprette søknad");
    } finally {
      setCreating(false);
    }
  }

  async function togglePipeline() {
    if (!isLoggedIn) {
      router.push(`/logg-inn?redirect=${encodeURIComponent(`/jobb/${slug}`)}`);
      return;
    }
    setError(null);
    if (savedId) {
      const prev = savedId;
      setSavedId(null);
      const res = await fetch(`/api/jobb/${slug}/save`, { method: "DELETE" });
      if (!res.ok) {
        setSavedId(prev);
        setError("Kunne ikke fjerne fra pipeline");
      }
    } else {
      try {
        await ensureSaved();
      } catch {
        setError("Kunne ikke legge til i pipeline");
      }
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobb/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Kunne ikke kopiere lenken");
    }
  }

  const busy = creating || pending;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={writeApplication}
          disabled={busy}
          aria-busy={busy}
          className="flex h-[44px] items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bg outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-wait disabled:opacity-60"
        >
          <FiEdit3 size={13} aria-hidden />
          {busy ? "Åpner …" : "Skriv søknadstekst"}
        </button>

        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Søk hos ${employerName}`}
            className="flex h-[44px] items-center gap-2 rounded-full border border-border-strong px-5 text-[13px] font-medium text-ink outline-none transition-colors hover:border-ink focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Søk på stillingen
            <FiExternalLink size={13} aria-hidden />
          </a>
        )}

        <button
          type="button"
          onClick={togglePipeline}
          aria-pressed={Boolean(savedId)}
          className={`flex h-[44px] items-center gap-1.5 rounded-full border px-4 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 ${
            savedId
              ? "border-ink bg-ink text-bg"
              : "border-border text-ink-soft hover:border-ink hover:text-ink"
          }`}
        >
          {savedId ? <FiCheck size={13} aria-hidden /> : <FiPlus size={13} aria-hidden />}
          {savedId ? "I pipeline" : "Pipeline"}
        </button>

        <button
          type="button"
          onClick={copyLink}
          className="ml-auto flex h-[44px] items-center gap-1.5 rounded-full px-3 text-[12px] text-ink-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          {copied ? <FiCheck size={13} aria-hidden /> : <FiCopy size={13} aria-hidden />}
          {copied ? "Kopiert" : "Kopier lenke"}
          <span aria-live="polite" className="sr-only">
            {copied ? "Lenke kopiert" : ""}
          </span>
        </button>
      </div>

      {savedId && (
        <p className="mt-2 text-[12px] text-ink-muted">
          Lagt til som kladd i pipelinen din.{" "}
          <Link
            href={`/app/pipeline/${savedId}`}
            className="rounded text-accent underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Åpne søknaden →
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-accent-ink">
          {error}
        </p>
      )}
    </div>
  );
}
