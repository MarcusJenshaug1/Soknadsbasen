import type { MetadataRoute } from "next";
import { absoluteUrl, siteUrl } from "@/lib/seo/siteConfig";

const DISALLOW = [
  "/app/",
  "/api/",
  "/logg-inn",
  "/registrer",
  "/glemt-passord",
  "/nytt-passord",
  "/suksess",
  "/velkommen",
  "/cv/print",
];

const ALLOWED_BOTS = [
  "Googlebot",
  "Googlebot-News",
  "Googlebot-Image",
  "Bingbot",
  "DuckDuckBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  // Social-link previews (Messenger/FB, LinkedIn, X/Twitter, Slack, iMessage,
  // WhatsApp, Telegram). Eksplisitt allowlist hjelper noen scrapers som
  // tolker fravær av matchende regel som disallow.
  "facebookexternalhit",
  "Facebot",
  "LinkedInBot",
  "Twitterbot",
  "Slackbot",
  "Slackbot-LinkExpanding",
  "WhatsApp",
  "TelegramBot",
  "Discordbot",
  "SkypeUriPreview",
  "Pinterestbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      ...ALLOWED_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW,
      })),
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: siteUrl.host,
  };
}
