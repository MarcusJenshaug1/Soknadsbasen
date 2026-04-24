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
  },
  address: {
    streetAddress: "Skallestadveien 22",
    postalCode: "3138",
    addressLocality: "Skallestad",
    addressRegion: "Vestfold",
    addressCountry: "NO",
  },
  sameAs: [] as string[],
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
