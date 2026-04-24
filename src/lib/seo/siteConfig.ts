// Bygg-ID for å tvinge cache-invalidering ved oppdatering: 2026-04-24-2
const DEFAULT_SITE_URL = "https://søknadsbasen.no";

function safeParseUrl(raw: string | undefined): URL {
  const candidate = (raw ?? "").trim();
  if (!candidate) return new URL(DEFAULT_SITE_URL);
  try {
    const u = new URL(candidate);
    // Verifiser at hostname parses til gyldig punycode/unicode
    if (!u.hostname || u.hostname.length === 0) {
      return new URL(DEFAULT_SITE_URL);
    }
    return u;
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export const siteUrl = safeParseUrl(process.env.NEXT_PUBLIC_SITE_URL);

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
    accent: "#c15a3a",
  },
} as const;

export function absoluteUrl(path: string = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return new URL(clean, siteUrl).toString();
}
