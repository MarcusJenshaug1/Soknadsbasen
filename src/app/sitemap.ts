import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { getAllGuides } from "@/lib/guide/loader";
import { COMPETITORS } from "@/lib/sammenligning/competitors";
import { INDUSTRIES } from "@/lib/cv-mal/industries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const guides = await getAllGuides();

  const guideEntries: MetadataRoute.Sitemap = guides.map((g) => ({
    url: absoluteUrl(`/guide/${g.frontmatter.slug}`),
    lastModified: new Date(
      g.frontmatter.updatedAt ?? g.frontmatter.publishedAt ?? now,
    ),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const competitorEntries: MetadataRoute.Sitemap = COMPETITORS.map((c) => ({
    url: absoluteUrl(`/sammenligning/${c.slug}`),
    lastModified: new Date(c.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const industryEntries: MetadataRoute.Sitemap = INDUSTRIES.map((i) => ({
    url: absoluteUrl(`/cv-mal/${i.slug}`),
    lastModified: new Date(i.publishedAt),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/funksjoner"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/priser"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/guide"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...guideEntries,
    {
      url: absoluteUrl("/cv-mal"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...industryEntries,
    {
      url: absoluteUrl("/sammenligning"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...competitorEntries,
    {
      url: absoluteUrl("/om"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/personvern"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl("/vilkar"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
