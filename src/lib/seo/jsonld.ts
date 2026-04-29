import { siteConfig, absoluteUrl } from "./siteConfig";

export type JsonLd = Record<string, unknown>;

const ORG_ID = `${absoluteUrl("/")}#organization`;
const SITE_ID = `${absoluteUrl("/")}#website`;

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: siteConfig.name,
    alternateName: "soknadsbasen",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon"),
    image: absoluteUrl("/opengraph-image"),
    email: siteConfig.contactEmail,
    slogan: siteConfig.tagline,
    description: siteConfig.description,
    areaServed: "NO",
    inLanguage: siteConfig.language,
    founder: {
      "@type": "Person",
      name: siteConfig.founder.name,
      email: siteConfig.founder.email,
    },
    address: {
      "@type": "PostalAddress",
      ...siteConfig.address,
    },
    ...(siteConfig.sameAs.length > 0 ? { sameAs: siteConfig.sameAs } : {}),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    name: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/guide")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function faqJsonLd(qa: Array<{ q: string; a: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export type ArticleInput = {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  author: { name: string; url?: string };
  image?: string;
  wordCount?: number;
};

export function articleJsonLd(a: ArticleInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.headline,
    description: a.description,
    mainEntityOfPage: absoluteUrl(a.path),
    url: absoluteUrl(a.path),
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    inLanguage: siteConfig.language,
    author: {
      "@type": "Person",
      name: a.author.name,
      ...(a.author.url ? { url: a.author.url } : {}),
    },
    publisher: { "@id": ORG_ID },
    image: a.image ? absoluteUrl(a.image) : absoluteUrl("/opengraph-image"),
    ...(a.wordCount ? { wordCount: a.wordCount } : {}),
  };
}

export function webApplicationJsonLd(): JsonLd {
  const monthly = siteConfig.pricing.monthly;
  const sixMonth = siteConfig.pricing.sixMonth;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${absoluteUrl("/")}#webapp`,
    name: siteConfig.name,
    alternateName: "soknadsbasen",
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: siteConfig.language,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Career",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    isAccessibleForFree: true,
    publisher: { "@id": ORG_ID },
    creator: { "@id": ORG_ID },
    image: absoluteUrl("/opengraph-image"),
    featureList: [
      "CV-bygger med åtte maler",
      "AI-assistert søknadsbrev",
      "Pipeline med kanban og listevisning",
      "Oppgaver og frister",
      "Innsikt i intervju-kilder",
      "ATS-optimalisert PDF-eksport",
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Månedlig abonnement",
        price: monthly.amount,
        priceCurrency: monthly.currency,
        category: "subscription",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Country", name: "NO" },
        description: `${monthly.trialDays} dagers gratis prøveperiode, deretter ${monthly.amount} kr per måned.`,
      },
      {
        "@type": "Offer",
        name: "Engangsbetaling 6 måneder",
        price: sixMonth.amount,
        priceCurrency: sixMonth.currency,
        category: "one-time",
        availability: "https://schema.org/InStock",
        eligibleRegion: { "@type": "Country", name: "NO" },
        description: `Engangsbetaling for ${sixMonth.durationMonths} måneders tilgang.`,
      },
    ],
  };
}

export type HowToStep = { name: string; text: string };

export type HowToInput = {
  name: string;
  description: string;
  path: string;
  steps: HowToStep[];
  totalTime?: string;
};

export function howToJsonLd(h: HowToInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: h.name,
    description: h.description,
    mainEntityOfPage: absoluteUrl(h.path),
    inLanguage: siteConfig.language,
    ...(h.totalTime ? { totalTime: h.totalTime } : {}),
    step: h.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
