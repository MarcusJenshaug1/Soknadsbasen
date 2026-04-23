import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { getAllGuides } from "@/lib/guide/loader";

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

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/guide"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...guideEntries,
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
