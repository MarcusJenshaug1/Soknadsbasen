"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatNok, relativeNb } from "@/lib/sales/format";
import { stageMeta } from "@/lib/sales/stages";
import type { LeadCardData } from "./LeadCard";

export function LeadsList({ leads }: { leads: LeadCardData[] }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("alle");
  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (stage !== "alle" && l.stage !== stage) return false;
      if (q && !l.companyName.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [leads, q, stage]);

  return (
    <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/6 dark:border-white/6">
        <input
          type="text"
          placeholder="Søk på bedrift…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40"
        />
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="text-[12px] bg-transparent border border-black/10 dark:border-white/10 rounded-full px-2.5 py-1 outline-none"
        >
          <option value="alle">Alle stages</option>
          <option value="Ny">Ny</option>
          <option value="Kontaktet">Kontaktet</option>
          <option value="Demo booket">Demo booket</option>
          <option value="Tilbud sendt">Tilbud sendt</option>
          <option value="Forhandling">Forhandling</option>
          <option value="Vunnet">Vunnet</option>
          <option value="Tapt">Tapt</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-ink/55 bg-black/[0.02] dark:bg-white/[0.03]">
              <th className="text-left px-4 py-2 font-medium">Bedrift</th>
              <th className="text-left px-4 py-2 font-medium">Stage</th>
              <th className="text-right px-4 py-2 font-medium">Verdi</th>
              <th className="text-right px-4 py-2 font-medium">%</th>
              <th className="text-right px-4 py-2 font-medium">Endret</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => {
              const meta = stageMeta(l.stage);
              return (
                <tr
                  key={l.id}
                  className="border-t border-black/6 dark:border-white/6 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <Link href={`/selger/leads/${l.id}`} prefetch={true} className="hover:underline">
                      {l.companyName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
                        color: meta.color,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatNok(l.estimatedValueCents, { compact: true })}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink/65">{l.probability}%</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink/55">{relativeNb(l.updatedAt)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/55 text-[12px]">
                  Ingen leads matcher filteret.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
