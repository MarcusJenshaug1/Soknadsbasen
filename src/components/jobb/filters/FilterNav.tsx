"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Delt navigasjon for filterklikk: checkbox = router.push(href) i en
 * transition med scroll:false (server-first — ingen klient-fetching av
 * listen). isPending eksponeres som data-attributt så treff-listen kan
 * dempes mens RSC-payloaden streames.
 */
const FilterNavContext = createContext<{
  navigate: (href: string) => void;
  isPending: boolean;
} | null>(null);

export function useFilterNav() {
  const ctx = useContext(FilterNavContext);
  if (!ctx) throw new Error("useFilterNav krever <FilterNavProvider>");
  return ctx;
}

export function FilterNavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  };

  return (
    <FilterNavContext.Provider value={{ navigate, isPending }}>
      <div data-filter-pending={isPending || undefined}>{children}</div>
    </FilterNavContext.Provider>
  );
}
