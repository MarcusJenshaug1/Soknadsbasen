const rawUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://søknadsbasen.no";

export const siteUrl = new URL(rawUrl);

export const siteConfig = {
  name: "Søknadsbasen",
  tagline: "Jobbsøking, med ro.",
  description:
    "Søknadsbasen samler CV-er, søknadsbrev og oppfølging i ett tydelig arbeidsrom. Bygget for å gi ro i jobbsøkingen — ikke flere distraksjoner.",
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
