// Hardkodet produksjons-URL. Env-var ble deaktivert 2026-04-24 pga
// Vercel-env med ugyldig punycode (xn--sknadsbasen-95a) som fortsatt
// lekket inn i prerender-chunks selv med safeParseUrl-wrapping.
// Endre hardkodingen under ved domenebytte, ikke via env.
export const siteUrl = new URL("https://søknadsbasen.no");

export const siteConfig = {
  name: "Søknadsbasen",
  tagline: "Jobbsøking, med ro.",
  description:
    "Søknadsbasen samler CV-er, søknadsbrev og oppfølging i ett tydelig arbeidsrom. Bygget for å gi ro i jobbsøkingen, ikke flere distraksjoner.",
  shortDescription:
    "Jobbsøker-plattform for rolig arbeid med CV, søknadsbrev og pipeline.",
  locale: "nb_NO",
  language: "nb-NO",
  country: "NO",
  contactEmail: "marcus@jenshaug.no",
  founder: {
    name: "Marcus Jenshaug",
    email: "marcus@jenshaug.no",
    role: "Fullstack-utvikler · Bygger Søknadsbasen",
    bio: "Marcus Jenshaug er fullstack-utvikler i Redi AS og driver Søknadsbasen som privatperson i Norge.",
  },
  address: {
    streetAddress: "Skallestadveien 22",
    postalCode: "3138",
    addressLocality: "Skallestad",
    addressRegion: "Vestfold",
    addressCountry: "NO",
  },
  sameAs: ["https://marcusjenshaug.no"] as string[],
  // SEO-KONTRAKT: Pris-endring må synkroniseres med PricingCards.tsx,
  // priser/page.tsx (PRICING_FAQ), competitors.ts (Pris-rader),
  // page.tsx (landing FAQ), og jsonld.ts (webApplicationJsonLd offers).
  // Se AGENTS.md "Sammenligning- og pris-sider er kontrakter".
  pricing: {
    monthly: { amount: 79, currency: "NOK", trialDays: 7 },
    sixMonth: { amount: 299, currency: "NOK", durationMonths: 6 },
  },
  brandColors: {
    bg: "#faf8f5",
    ink: "#14110e",
    accent: "#D5592E",
  },
} as const;

export function absoluteUrl(path: string = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return new URL(clean, siteUrl).toString();
}
