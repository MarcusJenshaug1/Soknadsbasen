import type { Job } from "@prisma/client";
import { absoluteUrl } from "@/lib/seo/siteConfig";
import { displayPlace } from "@/lib/jobs/format";

export type FormattedPost = {
  commentary: string;
  articleUrl: string;
  articleTitle: string;
  articleDescription: string;
};

const COMMENTARY_TEMPLATES = [
  ({ city, title, employer }: TplVars) =>
    `Ny stilling i ${city}: ${title} hos ${employer}. Søk via Søknadsbasen 👇`,
  ({ city, title, employer }: TplVars) =>
    `${employer} søker ${title} i ${city}. Les mer og lag søknad raskt 👇`,
  ({ city, title, employer }: TplVars) =>
    `${title} hos ${employer} (${city}). Hele annonsen og søknadshjelp 👇`,
  ({ city, title, employer }: TplVars) =>
    `Jobbtips: ${employer} har lyst ut ${title} i ${city} 👇`,
];

type TplVars = { city: string; title: string; employer: string };

export function buildJobPost(job: Job): FormattedPost {
  const city = pickCity(job);
  const titleClean = (job.title ?? "").trim().replace(/\s+/g, " ");
  const employerClean = (job.employerName ?? "").trim().replace(/\s+/g, " ");

  const tpl = COMMENTARY_TEMPLATES[hashIndex(job.id, COMMENTARY_TEMPLATES.length)];
  const commentaryBase = tpl({ city, title: titleClean, employer: employerClean });
  const hashtags = buildHashtags(job, city);
  const commentary = stripEmDash(`${commentaryBase}\n\n${hashtags}`);

  const articleTitle = stripEmDash(
    truncate(`${titleClean} hos ${employerClean}`, 200),
  );
  const articleDescription = stripEmDash(
    truncate(htmlToPlainText(job.description ?? ""), 250),
  );

  const path = `/jobb/${encodeURIComponent(job.slug)}?utm_source=linkedin&utm_medium=social&utm_campaign=jobs-auto`;
  const articleUrl = absoluteUrl(path);

  return { commentary, articleUrl, articleTitle, articleDescription };
}

function pickCity(job: Job): string {
  const candidates = [job.location, job.region].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 1,
  );
  if (candidates.length === 0) return "Norge";
  return displayPlace(candidates[0]) || "Norge";
}

function buildHashtags(job: Job, city: string): string {
  const tags = new Set<string>();
  tags.add("Søknadsbasen");
  tags.add("Jobb");

  const cityTag = toCamelTag(city);
  if (cityTag && cityTag !== "Norge") tags.add(`Jobbi${cityTag}`);

  const cat = (job.category ?? "").trim();
  if (cat) {
    const catTag = toCamelTag(cat);
    if (catTag) tags.add(catTag);
  }

  return Array.from(tags)
    .slice(0, 5)
    .map((t) => `#${t}`)
    .join(" ");
}

function toCamelTag(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[^A-Za-zÆØÅæøå0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part, i) => {
      const lower = part.toLocaleLowerCase("nb-NO");
      const cap =
        lower.charAt(0).toLocaleUpperCase("nb-NO") + lower.slice(1);
      return i === 0 ? cap : cap;
    })
    .join("");
}

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.trim()}…`;
}

function stripEmDash(s: string): string {
  return s.replace(/—/g, ",").replace(/–/g, ",");
}

function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % mod;
}
