import { COMPETITORS } from "@/lib/sammenligning/competitors";
import { INDUSTRIES } from "@/lib/cv-mal/industries";

export type NavLink = { label: string; href: string; description?: string };

export type NavSection = { title: string; links: NavLink[]; viewAll?: NavLink };

export const PRODUCT_FEATURE_LINKS: NavLink[] = [
  {
    label: "CV-bygger",
    href: "/funksjoner#cv-bygger",
    description: "ATS-vennlige maler",
  },
  {
    label: "Søknadsbrev",
    href: "/funksjoner#soknadsbrev",
    description: "AI-assistert tekst",
  },
  {
    label: "Pipeline",
    href: "/funksjoner#pipeline",
    description: "Kanban + oppfølging",
  },
  {
    label: "Innsikt",
    href: "/funksjoner#innsikt",
    description: "Data om jobbsøkingen",
  },
  {
    label: "Personvern",
    href: "/funksjoner#personvern",
    description: "EU-lagret, du eier alt",
  },
];

export const PRODUCT_REASON_LINKS: NavLink[] = [
  { label: "Priser", href: "/priser", description: "79 kr/mnd eller 299 kr engangs" },
  { label: "Stillinger", href: "/jobb", description: "Søk i NAV-stillinger" },
  { label: "Om Marcus", href: "/om", description: "Hvem som står bak" },
  { label: "FAQ", href: "/#faq", description: "Vanlige spørsmål" },
];

export const CV_MAL_LINKS: NavLink[] = INDUSTRIES.map((i) => ({
  label: i.shortName.charAt(0).toUpperCase() + i.shortName.slice(1),
  href: `/cv-mal/${i.slug}`,
  description: `CV-mal for ${i.shortName}`,
}));

export const SAMMENLIGNING_LINKS: NavLink[] = COMPETITORS.map((c) => ({
  label: `vs ${c.shortName}`,
  href: `/sammenligning/${c.slug}`,
  description: c.category,
}));

export const PRIMARY_NAV: Array<
  | { kind: "link"; label: string; href: string; dot?: boolean }
  | {
      kind: "menu";
      label: string;
      key: string;
      activePrefix: string;
      sections: NavSection[];
    }
> = [
  {
    kind: "menu",
    label: "Produkt",
    key: "produkt",
    activePrefix: "/funksjoner",
    sections: [
      { title: "Funksjoner", links: PRODUCT_FEATURE_LINKS, viewAll: { label: "Se alle funksjoner", href: "/funksjoner" } },
      { title: "Hvorfor Søknadsbasen", links: PRODUCT_REASON_LINKS },
    ],
  },
  {
    kind: "menu",
    label: "CV-maler",
    key: "cv-mal",
    activePrefix: "/cv-mal",
    sections: [
      { title: "Bransjer", links: CV_MAL_LINKS, viewAll: { label: "Alle bransjer", href: "/cv-mal" } },
    ],
  },
  {
    kind: "menu",
    label: "Sammenlign",
    key: "sammenligning",
    activePrefix: "/sammenligning",
    sections: [
      { title: "Konkurrenter", links: SAMMENLIGNING_LINKS, viewAll: { label: "Alle sammenligninger", href: "/sammenligning" } },
    ],
  },
  { kind: "link", label: "Stillinger", href: "/jobb", dot: true },
  { kind: "link", label: "Guide", href: "/guide" },
  { kind: "link", label: "Priser", href: "/priser" },
];

export const FOOTER_COLUMNS: Array<{ title: string; links: NavLink[]; viewAll?: NavLink }> = [
  {
    title: "Produkt",
    links: [
      { label: "Funksjoner", href: "/funksjoner" },
      { label: "Priser", href: "/priser" },
      { label: "Stillinger", href: "/jobb" },
      { label: "Guide", href: "/guide" },
    ],
  },
  {
    title: "CV-maler",
    links: CV_MAL_LINKS,
    viewAll: { label: "Alle bransjer", href: "/cv-mal" },
  },
  {
    title: "Sammenlign",
    links: SAMMENLIGNING_LINKS,
    viewAll: { label: "Alle sammenligninger", href: "/sammenligning" },
  },
  {
    title: "Selskap",
    links: [
      { label: "Om Marcus", href: "/om" },
      { label: "FAQ", href: "/#faq" },
      { label: "Personvern", href: "/personvern" },
      { label: "Vilkår", href: "/vilkar" },
      { label: "Kontakt", href: "mailto:marcus@jenshaug.no" },
    ],
  },
];
