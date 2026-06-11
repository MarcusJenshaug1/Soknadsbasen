"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";

import {
  buildJobbUrl,
  toggleParam,
  type JobbParams,
} from "@/lib/jobs/search-params";

import { useFilterNav } from "../filters/FilterNav";

type Entry = { kind: "fylke" | "kommune" | "kategori"; slug: string; label: string };
type Suggestion =
  | { id: string; group: "Sted" | "Yrke"; entry: Entry }
  | { id: string; group: "Fritekst"; text: string };

const KIND_LABEL: Record<Entry["kind"], string> = {
  fylke: "Fylke",
  kommune: "Kommune",
  kategori: "Kategori",
};

/**
 * Kombinert typeahead (ARIA 1.2 combobox): forslag gruppert Sted/Yrke/
 * Fritekst, 200 ms debounce, piltast-navigasjon, Escape lukker. Valg er
 * navigasjon — sted/yrke legges til som filter, fritekst setter q.
 */
export function SearchTypeahead({ params }: { params: JobbParams }) {
  const { navigate } = useFilterNav();
  const [draft, setDraft] = useState(params.q);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listId = useId();

  // Synk draft med navigert q (derive-during-render, ikke effect).
  const [lastQ, setLastQ] = useState(params.q);
  if (lastQ !== params.q) {
    setLastQ(params.q);
    setDraft(params.q);
  }

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced + abortbar henting; utdaterte svar forkastes via AbortController.
  // entries beholdes ved < 2 tegn — listen filtreres bort i render i stedet
  // (unngår synkron setState i effect).
  useEffect(() => {
    const q = draft.trim();
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/jobb/typeahead?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { steder: Entry[]; yrker: Entry[] };
        setEntries([...data.steder, ...data.yrker]);
        setActiveIdx(-1);
      } catch {
        // abort/nettverk: behold forrige forslag
      }
    }, 200);
    return () => clearTimeout(t);
  }, [draft]);

  const effectiveEntries = draft.trim().length >= 2 ? entries : [];
  const suggestions: Suggestion[] = [
    ...effectiveEntries.map((entry, i) => ({
      id: `${listId}-opt-${i}`,
      group: (entry.kind === "kategori" ? "Yrke" : "Sted") as "Sted" | "Yrke",
      entry,
    })),
    ...(draft.trim()
      ? [
          {
            id: `${listId}-opt-q`,
            group: "Fritekst" as const,
            text: draft.trim(),
          },
        ]
      : []),
  ];
  const showList = open && suggestions.length > 0;

  const pick = (s: Suggestion) => {
    setOpen(false);
    if (s.group === "Fritekst") {
      navigate(buildJobbUrl({ ...params, q: s.text, side: 1 }));
      return;
    }
    setDraft("");
    const key = s.entry.kind === "kategori" ? "kategori" : s.entry.kind;
    navigate(buildJobbUrl(toggleParam(params, key, s.entry.slug)));
  };

  const submitQ = () => {
    setOpen(false);
    navigate(buildJobbUrl({ ...params, q: draft.trim(), side: 1 }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showList) setOpen(false);
      else setDraft("");
      return;
    }
    if (!showList && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Home" && showList) {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End" && showList) {
      e.preventDefault();
      setActiveIdx(suggestions.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && activeIdx >= 0) pick(suggestions[activeIdx]);
      else submitQ();
    }
  };

  let lastGroup: string | null = null;

  return (
    <div ref={boxRef} className="relative" role="search">
      <div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface py-2 pl-5 pr-2 transition-shadow focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
        <FiSearch size={16} aria-hidden className="shrink-0 text-ink-muted" />
        <input
          type="text"
          value={draft}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-activedescendant={activeIdx >= 0 ? suggestions[activeIdx]?.id : undefined}
          aria-autocomplete="list"
          aria-label="Søk etter yrke, arbeidsgiver eller sted"
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Yrke, arbeidsgiver eller sted, f.eks. «utvikler» eller «Bergen»"
          className="h-[34px] w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted"
        />
        {draft && (
          <button
            type="button"
            aria-label="Tøm søk"
            onClick={() => {
              setDraft("");
              if (params.q) navigate(buildJobbUrl({ ...params, q: "", side: 1 }));
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <FiX size={14} aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={submitQ}
          className="h-[36px] shrink-0 rounded-full bg-ink px-5 text-[13px] font-medium text-bg outline-none transition-colors hover:bg-accent hover:text-white focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Søk
        </button>
      </div>

      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          aria-label="Søkeforslag"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-border bg-surface py-1.5 shadow-[0_18px_50px_-12px_rgba(20,17,14,0.25)]"
        >
          {suggestions.map((s, i) => {
            const showGroup = s.group !== lastGroup;
            lastGroup = s.group;
            return (
              <li key={s.id} role="presentation">
                {showGroup && (
                  <div
                    aria-hidden
                    className="px-4 pb-0.5 pt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted"
                  >
                    {s.group}
                  </div>
                )}
                <button
                  type="button"
                  id={s.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === activeIdx ? "bg-panel" : "hover:bg-panel"
                  }`}
                >
                  <span className="text-[13px] text-ink">
                    {s.group === "Fritekst" ? `Søk etter «${s.text}»` : s.entry.label}
                  </span>
                  {s.group !== "Fritekst" && (
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                      {KIND_LABEL[s.entry.kind]}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          <li role="presentation">
            <p aria-live="polite" className="sr-only">
              {suggestions.length} forslag
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
