"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FiList, FiMenu } from "react-icons/fi";

import { setDensity, touchLastVisit } from "@/lib/jobs/actions";
import type { Density } from "./JobCard";

/**
 * Tetthets-toggle (designreferansen): segmentert ikon-par komfortabel/kompakt.
 * Valget lagres via server action (cookie + profil) og listen re-rendres.
 */
export function DensityToggle({ current }: { current: Density }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(current);

  return (
    <div
      role="group"
      aria-label="Tetthet"
      className="flex h-[34px] items-center rounded-full border border-border bg-surface p-[3px]"
    >
      {(
        [
          ["komfortabel", FiMenu, "Komfortabel visning"],
          ["kompakt", FiList, "Kompakt visning"],
        ] as const
      ).map(([value, Icon, label]) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={optimistic === value}
          onClick={() =>
            startTransition(async () => {
              setOptimistic(value);
              await setDensity(value);
              router.refresh();
            })
          }
          className={`flex h-[26px] w-[36px] items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 ${
            optimistic === value ? "bg-ink text-bg" : "text-ink-muted hover:text-ink"
          }`}
        >
          <Icon size={13} aria-hidden />
        </button>
      ))}
    </div>
  );
}

/**
 * Oppdaterer «forrige besøk»-cookien ~10 s etter render, slik at inneværende
 * visning fortsatt bruker forrige besøkstid for Ny-markeringen.
 */
export function VisitTracker() {
  useEffect(() => {
    const t = setTimeout(() => void touchLastVisit(), 10_000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
