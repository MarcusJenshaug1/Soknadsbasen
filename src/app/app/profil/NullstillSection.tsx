"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { suspendCloudSync } from "@/hooks/useCloudSync";
import { cn } from "@/lib/cn";

type Category =
  | "cv"
  | "soknader"
  | "soknadsbrev"
  | "oppgaver"
  | "lagredeSok"
  | "selskaper"
  | "kontakter"
  | "sesjoner";

const CATEGORY_META: { id: Category; label: string; sub: string }[] = [
  { id: "cv", label: "CV", sub: "Alle CV-er, versjoner, delingslenker og CV-hjelpere" },
  { id: "soknader", label: "Søknader", sub: "Inkluderer søknadsbrev, oppgaver, vedlegg og aktivitetslogg" },
  { id: "soknadsbrev", label: "Søknadsbrev", sub: "Kun brevene, søknadene beholdes" },
  { id: "oppgaver", label: "Oppgaver", sub: "Kun oppgavene, søknadene beholdes" },
  { id: "lagredeSok", label: "Lagrede søk", sub: "Søk og varsler i stillingslisten" },
  { id: "selskaper", label: "Selskaper", sub: "Firmaer du har registrert" },
  { id: "kontakter", label: "Kontakter", sub: "Nettverket ditt" },
  { id: "sesjoner", label: "Sesjoner", sub: "Jobbsøk-perioder, søknadene beholdes" },
];

export function NullstillSection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<Category, number> | null>(null);
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open || counts) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/reset");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = (await res.json()) as { counts: Record<Category, number> };
        if (!cancelled) setCounts(d.counts);
      } catch {
        if (!cancelled) setError("Kunne ikke hente oversikten. Prøv igjen.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, counts]);

  function toggle(id: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    if (confirm !== "NULLSTILL" || selected.size === 0) return;
    setBusy(true);
    setError(null);
    const touchesCv = selected.has("cv") || selected.has("soknadsbrev");
    try {
      // CV-/brev-data synces fra klientens minne (beforeunload-beacon) —
      // uten suspend ville den slettede CV-en gjenoppstå ved navigasjon.
      if (touchesCv) suspendCloudSync();
      const res = await fetch("/api/user/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: [...selected], confirm }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `HTTP ${res.status}`);
      }
      setDone(true);
      if (touchesCv) {
        window.location.reload();
      } else {
        setCounts(null);
        setSelected(new Set());
        setConfirm("");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt. Prøv igjen.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-surface">
        <div className="min-w-0">
          <div className="text-[14px] font-medium">Nullstill innhold</div>
          <div className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55 mt-0.5">
            Slett valgte kategorier og start på nytt. Kontoen beholdes.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 px-4 py-2 rounded-full text-[12px] font-medium border border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 transition-colors"
        >
          Nullstill
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onReset}
      className="p-5 rounded-2xl border border-accent/30 bg-accent/5 space-y-4"
    >
      <div>
        <h3 className="text-[14px] font-medium text-accent mb-1">Nullstill innhold</h3>
        <p className="text-[12px] text-[#14110e]/65 dark:text-[#f0ece6]/65">
          Velg hva som skal slettes permanent. Kontoen og abonnementet beholdes.
        </p>
      </div>

      {!counts && !error && (
        <p className="text-[12px] text-[#14110e]/55 dark:text-[#f0ece6]/55">Henter oversikt …</p>
      )}

      {counts && (
        <fieldset className="space-y-1.5">
          <legend className="sr-only">Kategorier som nullstilles</legend>
          {CATEGORY_META.map((c) => {
            const count = counts[c.id] ?? 0;
            const disabled = count === 0;
            const overlapped =
              selected.has("soknader") && (c.id === "soknadsbrev" || c.id === "oppgaver");
            return (
              <label
                key={c.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                  disabled
                    ? "border-black/5 dark:border-white/5 opacity-50"
                    : "border-black/10 dark:border-white/10 bg-surface cursor-pointer hover:border-black/25 dark:hover:border-white/25",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  disabled={disabled || busy}
                  className="mt-0.5 h-4 w-4 accent-[#D5592E]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
                    {c.label}
                    <span className="text-[11px] font-normal tabular-nums text-[#14110e]/45 dark:text-[#f0ece6]/45">
                      {count}
                    </span>
                  </span>
                  <span className="block text-[11.5px] text-[#14110e]/55 dark:text-[#f0ece6]/55">
                    {overlapped ? "Dekkes allerede av Søknader" : c.sub}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {counts && (
        <div>
          <label
            htmlFor="nullstill-confirm"
            className="block text-[12px] text-[#14110e]/65 dark:text-[#f0ece6]/65 mb-1.5"
          >
            Skriv <strong className="font-semibold">NULLSTILL</strong> for å bekrefte
          </label>
          <input
            id="nullstill-confirm"
            type="text"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="w-full max-w-[240px] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-bg text-[13px]"
          />
        </div>
      )}

      {error && (
        <p className="text-[12px] text-accent" role="alert">
          {error}
        </p>
      )}
      {done && !busy && (
        <p className="text-[12px] text-ink" role="status">
          Valgte kategorier er nullstilt.
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setSelected(new Set());
            setConfirm("");
            setError(null);
            setDone(false);
          }}
          className="px-4 py-2 rounded-full border border-black/15 dark:border-white/15 text-[12px] hover:border-black/30 dark:hover:border-white/30"
        >
          Avbryt
        </button>
        <button
          type="submit"
          disabled={busy || selected.size === 0 || confirm !== "NULLSTILL"}
          className="px-5 py-2 rounded-full bg-accent text-bg text-[12px] font-medium hover:bg-[#a94424] dark:hover:bg-[#c45830] transition-colors disabled:opacity-50"
        >
          {busy ? "Nullstiller …" : "Nullstill valgte"}
        </button>
      </div>
    </form>
  );
}
