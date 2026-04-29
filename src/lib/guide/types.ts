export const GUIDE_CATEGORIES = [
  "Søknad",
  "CV",
  "Intervju",
  "Jobbsøkestrategi",
  "Karriereskifte",
  "Lønn og forhandling",
] as const;

export type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

export type GuideAuthor = {
  name: string;
  url?: string;
  role?: string;
  bio?: string;
};

export type GuideCTA = {
  label: string;
  href: string;
  text: string;
};

export type GuideFrontmatter = {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  tags: GuideCategory[];
  tldr: string[];
  author: GuideAuthor;
  schema: "Article" | "HowTo";
  related?: string[];
  faq?: Array<{ q: string; a: string }>;
  howToSteps?: Array<{ name: string; text: string }>;
  howToTotalTime?: string;
  ctaMid?: GuideCTA;
  ctaEnd?: GuideCTA;
};

export type GuideTocItem = {
  id: string;
  text: string;
  depth: 2 | 3;
};

export type Guide = {
  frontmatter: GuideFrontmatter;
  html: string;
  htmlTop: string;
  htmlBottom: string;
  toc: GuideTocItem[];
  wordCount: number;
  readingMinutes: number;
};
