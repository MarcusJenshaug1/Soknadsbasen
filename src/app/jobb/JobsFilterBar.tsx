"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { displayPlace, formatCategory } from "@/lib/jobs/format";

type Props = {
  q: string;
  region: string;
  kategori: string;
  regions: string[];
  categories: string[];
  sort: "recent" | "match";
  isLoggedIn: boolean;
};

export function JobsFilterBar({
  q,
  region,
  kategori,
  regions,
  categories,
  sort,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  function update(next: {
    q?: string;
    region?: string;
    kategori?: string;
    sort?: "recent" | "match";
  }) {
    const sp = new URLSearchParams();
    const qVal = next.q !== undefined ? next.q : search;
    const rVal = next.region !== undefined ? next.region : region;
    const kVal = next.kategori !== undefined ? next.kategori : kategori;
    const sVal = next.sort !== undefined ? next.sort : sort;
    if (qVal) sp.set("q", qVal);
    if (rVal) sp.set("region", rVal);
    if (kVal) sp.set("kategori", kVal);
    if (sVal === "match") sp.set("sort", "match");
    const qs = sp.toString();
    startTransition(() => {
      router.push(`/jobb${qs ? `?${qs}` : ""}`);
    });
  }

  const inputClass =
    "w-full h-11 px-4 rounded-xl border border-black/10 bg-white text-[14px] outline-none focus:border-[#14110e]/40 focus:bg-white transition-colors";
  const selectClass =
    "w-full h-11 px-3.5 pr-9 rounded-xl border border-black/10 bg-white text-[13px] outline-none focus:border-[#14110e]/40 cursor-pointer appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:14px_14px] disabled:opacity-50 disabled:cursor-not-allowed";
  const chevron = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='%2314110e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E")`;

  return (
    <div className="rounded-2xl border border-black/10 bg-[#eee9df]/40 p-3 md:p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: search });
        }}
        className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-2"
      >
        <div className="relative">
          <label htmlFor="job-search" className="sr-only">
            Søk etter stilling eller arbeidsgiver
          </label>
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-[16px] text-[#14110e]/45 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            id="job-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tittel eller arbeidsgiver"
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={region}
          onChange={(e) => update({ region: e.target.value })}
          aria-label="Region"
          className={`${selectClass} md:min-w-[160px]`}
          style={{ backgroundImage: chevron }}
        >
          <option value="">Hele Norge</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {displayPlace(r)}
            </option>
          ))}
        </select>
        <select
          value={kategori}
          onChange={(e) => update({ kategori: e.target.value })}
          aria-label="Kategori"
          disabled={categories.length === 0}
          className={`${selectClass} md:min-w-[180px]`}
          style={{ backgroundImage: chevron }}
        >
          <option value="">
            {categories.length === 0 ? "Kategorier kommer" : "Alle kategorier"}
          </option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {formatCategory(c)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 px-6 rounded-xl bg-[#D5592E] text-[#faf8f5] text-[13px] font-medium hover:bg-[#a94424] transition-colors"
        >
          Søk
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
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
            <FilterChip
              label={displayPlace(region)}
              onClear={() => update({ region: "" })}
            />
          )}
          {kategori && (
            <FilterChip
              label={formatCategory(kategori)}
              onClear={() => update({ kategori: "" })}
            />
          )}
        </div>
        {isLoggedIn && (
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-white border border-black/10">
            <SortPill
              active={sort === "recent"}
              onClick={() => update({ sort: "recent" })}
            >
              Nyeste
            </SortPill>
            <SortPill
              active={sort === "match"}
              onClick={() => update({ sort: "match" })}
            >
              Best match
            </SortPill>
          </div>
        )}
      </div>
    </div>
  );
}

function SortPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "px-3 py-1 rounded-full text-[12px] font-medium bg-[#14110e] text-[#faf8f5]"
          : "px-3 py-1 rounded-full text-[12px] text-[#14110e]/65 hover:text-[#14110e]"
      }
    >
      {children}
    </button>
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
