"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { Density } from "./JobCard";

type DensityContextValue = {
  density: Density;
  setDensity: (value: Density) => void;
};

const DensityContext = createContext<DensityContextValue | null>(null);

/**
 * Klient-eid tetthetstilstand: server-rendrede kort styler begge varianter via
 * data-density-attributtet, så bytte er ren CSS uten RSC-refetch. Initial
 * kommer fra cookie/profil på server (SSR-korrekt, ingen flash).
 */
export function DensityProvider({
  initial,
  children,
}: {
  initial: Density;
  children: ReactNode;
}) {
  const [density, setDensity] = useState<Density>(initial);
  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      <div data-density={density} className="group/density flex flex-col gap-4">
        {children}
      </div>
    </DensityContext.Provider>
  );
}

export function useDensity(): DensityContextValue {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity må brukes innenfor DensityProvider");
  return ctx;
}
