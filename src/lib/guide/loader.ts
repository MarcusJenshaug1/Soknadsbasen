import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { marked } from "marked";
import type { Guide, GuideFrontmatter, GuideTocItem } from "./types";
import { readingTimeMinutes, slugifyHeading } from "./format";

const GUIDES_DIR = path.join(process.cwd(), "src", "content", "guide");

async function listSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(GUIDES_DIR);
    return files
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""));
  } catch {
    return [];
  }
}

function renderMarkdown(content: string): {
  html: string;
  toc: GuideTocItem[];
} {
  const rawHtml = marked.parse(content, { async: false }) as string;
  const toc: GuideTocItem[] = [];
  const counts = new Map<string, number>();

  const html = rawHtml.replace(
    /<(h[23])>([\s\S]*?)<\/\1>/g,
    (_m, tag: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const base = slugifyHeading(text);
      const n = counts.get(base) ?? 0;
      const id = n === 0 ? base : `${base}-${n + 1}`;
      counts.set(base, n + 1);
      toc.push({ id, text, depth: tag === "h2" ? 2 : 3 });
      return `<${tag} id="${id}">${inner}</${tag}>`;
    },
  );

  return { html, toc };
}

function splitAtMiddleH2(html: string): [string, string] {
  const positions: number[] = [];
  const regex = /<h2\b/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) positions.push(match.index);
  if (positions.length < 2) return [html, ""];
  const pos = positions[Math.floor(positions.length / 2)];
  return [html.slice(0, pos), html.slice(pos)];
}

export const getGuide = cache(async (slug: string): Promise<Guide | null> => {
  try {
    const filePath = path.join(GUIDES_DIR, `${slug}.md`);
    const raw = await fs.readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const fm = { ...(data as Omit<GuideFrontmatter, "slug">), slug };
    const { html, toc } = renderMarkdown(content);
    const [htmlTop, htmlBottom] = splitAtMiddleH2(html);
    return {
      frontmatter: fm,
      html,
      htmlTop,
      htmlBottom,
      toc,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      readingMinutes: readingTimeMinutes(content),
    };
  } catch {
    return null;
  }
});

export const getAllGuides = cache(async (): Promise<Guide[]> => {
  const slugs = await listSlugs();
  const guides = await Promise.all(slugs.map((s) => getGuide(s)));
  return guides
    .filter((g): g is Guide => !!g)
    .sort((a, b) =>
      (b.frontmatter.publishedAt ?? "").localeCompare(
        a.frontmatter.publishedAt ?? "",
      ),
    );
});

export const getAllGuideSlugs = cache(async (): Promise<string[]> => {
  return await listSlugs();
});

export const getRelatedGuides = cache(
  async (slugs: string[] = []): Promise<Guide[]> => {
    const guides = await Promise.all(slugs.map((s) => getGuide(s)));
    return guides.filter((g): g is Guide => !!g);
  },
);

export type GuideRaw = {
  frontmatter: GuideFrontmatter;
  content: string;
};

export const getAllGuidesRaw = cache(async (): Promise<GuideRaw[]> => {
  const slugs = await listSlugs();
  const raw = await Promise.all(
    slugs.map(async (slug): Promise<GuideRaw | null> => {
      try {
        const filePath = path.join(GUIDES_DIR, `${slug}.md`);
        const file = await fs.readFile(filePath, "utf8");
        const { data, content } = matter(file);
        return {
          frontmatter: { ...(data as Omit<GuideFrontmatter, "slug">), slug },
          content,
        };
      } catch {
        return null;
      }
    }),
  );
  return raw
    .filter((g): g is GuideRaw => !!g)
    .sort((a, b) =>
      (b.frontmatter.publishedAt ?? "").localeCompare(
        a.frontmatter.publishedAt ?? "",
      ),
    );
});
