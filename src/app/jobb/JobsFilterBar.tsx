"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  q: string;
  region: string;
  kategori: string;
  regions: string[];
  categories: string[];
};

export function JobsFilterBar({ q, region, kategori, regions, categories }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  function update(next: { q?: string; region?: string; kategori?: string }) {
    const sp = new URLSearchParams();
    const qVal = next.q !== undefined ? next.q : search;
    const rVal = next.region !== undefined ? next.region : region;
    const kVal = next.kategori !== undefined ? next.kategori : kategori;
    if (qVal) sp.set("q", qVal);
    if (rVal) sp.set("region", rVal);
    if (kVal) sp.set("kategori", kVal);
    const qs = sp.toString();
    startTransition(() => {
      router.push(`/jobb${qs ? `?${qs}` : ""}`);
    });
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: search });
        }}
        className="flex flex-col md:flex-row gap-3 md:items-center"
      >
        <div className="flex-1">
          <label htmlFor="job-search" className="sr-only">
            Søk etter stilling eller arbeidsgiver
          </label>
          <input
            id="job-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk på tittel eller arbeidsgiver..."
            className="w-full px-4 py-2.5 rounded-full border border-black/10 bg-[#faf8f5] text-[14px] outline-none focus:border-[#D5592E] focus:ring-2 focus:ring-[#D5592E]/20 transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={region}
            onChange={(e) => update({ region: e.target.value })}
            aria-label="Region"
            className="px-4 py-2.5 rounded-full border border-black/10 bg-[#faf8f5] text-[13px] outline-none focus:border-[#D5592E] cursor-pointer min-w-[140px]"
          >
            <option value="">Hele Norge</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={kategori}
            onChange={(e) => update({ kategori: e.target.value })}
            aria-label="Kategori"
            className="px-4 py-2.5 rounded-full border border-black/10 bg-[#faf8f5] text-[13px] outline-none focus:border-[#D5592E] cursor-pointer min-w-[140px]"
          >
            <option value="">Alle kategorier</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors"
          >
            Søk
          </button>
        </div>
      </form>
      {(q || region || kategori) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q && (
            <FilterChip
              label={`"${q}"`}
              onClear={() => {
                setSearch("");
                update({ q: "" });
              }}
            />
          )}
          {region && (
            <FilterChip label={region} onClear={() => update({ region: "" })} />
          )}
          {kategori && (
            <FilterChip label={kategori} onClear={() => update({ kategori: "" })} />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eee9df] text-[12px] text-[#14110e]/80">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Fjern filter ${label}`}
        className="size-4 rounded-full bg-[#14110e]/10 hover:bg-[#14110e]/20 flex items-center justify-center text-[10px] leading-none"
      >
        ×
      </button>
    </span>
  );
}
