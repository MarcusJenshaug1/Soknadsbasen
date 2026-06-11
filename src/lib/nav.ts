import type { ComponentType } from "react";
import { IconHome, IconDoc, IconGrid, IconTrend } from "@/components/ui/Icons";

/**
 * Én sannhetskilde for app-navigasjonen. Både Sidebar (desktop) og
 * BottomTabBar (mobil) leser herfra, så labels, gating og aktiv-logikk aldri
 * drifter fra hverandre (tidligere het /app/cv "Min CV" i sidebar men "CV" i
 * tab-baren, med ulik active-match).
 */

export type NavGroup = "hoved" | "verktoy" | "konto";

export type NavItem = {
  href: string;
  label: string;
  /** Kompakt label til den smale tab-baren (faller tilbake til label). */
  shortLabel?: string;
  /** Kun primaryTab-items trenger ikon (tab-baren). Sidebar er tekst. */
  icon?: ComponentType<{ size?: number }>;
  gated: boolean;
  group: NavGroup;
  /** Vises direkte i mobil tab-bar; resten havner under "Mer". */
  primaryTab?: boolean;
  dot?: boolean;
};

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  hoved: "Arbeid",
  verktoy: "Verktøy",
  konto: "Konto",
};

export const NAV_GROUP_ORDER: NavGroup[] = ["hoved", "verktoy", "konto"];

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/app", label: "Hjem", icon: IconHome, gated: true, group: "hoved", primaryTab: true },
  { href: "/app/cv", label: "Min CV", shortLabel: "CV", icon: IconDoc, gated: true, group: "hoved", primaryTab: true },
  { href: "/app/pipeline", label: "Søknader", icon: IconGrid, gated: true, group: "hoved", primaryTab: true },
  { href: "/app/innsikt", label: "Innsikt", icon: IconTrend, gated: true, group: "hoved", primaryTab: true },
  { href: "/app/brev", label: "Søknadsbrev", gated: true, group: "verktoy" },
  { href: "/app/lagrede-sok", label: "Lagrede søk", gated: true, group: "verktoy" },
  { href: "/app/oppgaver", label: "Oppgaver", gated: true, group: "verktoy" },
  { href: "/app/selskaper", label: "Selskaper", gated: true, group: "verktoy" },
  { href: "/app/nettverk", label: "Nettverk", gated: true, group: "verktoy" },
  { href: "/app/sesjoner", label: "Sesjoner", gated: true, group: "verktoy" },
  { href: "/jobb", label: "Stillinger", gated: false, group: "konto", dot: true },
  { href: "/app/billing", label: "Abonnement", gated: false, group: "konto" },
];

/** Konsistent aktiv-match: eksakt "/app", ellers prefiks-match på segmentet. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
