import { INDEXNOW_KEY } from "@/lib/seo/indexnow";

export const dynamic = "force-static";

export function GET(): Response {
  return new Response(INDEXNOW_KEY, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
