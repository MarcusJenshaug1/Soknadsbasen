import "server-only";
import sitemap from "@/app/sitemap";
import { siteUrl, absoluteUrl } from "./siteConfig";

// Static IndexNow key. Public by design (verification file at /<KEY>.txt).
// Same key works for Bing, Yandex, IndexNow.org consortium.
export const INDEXNOW_KEY = "soknadsbasen-indexnow-2026";

const KEY_LOCATION = absoluteUrl(`/${INDEXNOW_KEY}.txt`);
const ENDPOINTS = [
  "https://api.indexnow.org/IndexNow",
  "https://www.bing.com/indexnow",
];

export type IndexNowResult = {
  endpoint: string;
  status: number;
  ok: boolean;
  error?: string;
};

export async function getAllPublicUrls(): Promise<string[]> {
  const entries = await sitemap();
  return entries.map((e) => e.url);
}

export async function submitToIndexNow(
  urls: string[],
): Promise<IndexNowResult[]> {
  if (urls.length === 0) return [];

  const body = JSON.stringify({
    host: siteUrl.host,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.slice(0, 10000),
  });

  const results = await Promise.all(
    ENDPOINTS.map(async (endpoint): Promise<IndexNowResult> => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body,
        });
        return {
          endpoint,
          status: res.status,
          ok: res.ok || res.status === 202,
        };
      } catch (err) {
        return {
          endpoint,
          status: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  return results;
}
