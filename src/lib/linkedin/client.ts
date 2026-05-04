import "server-only";

const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const DEFAULT_API_VERSION = "202504";

let cached: { token: string; expiresAt: number } | null = null;

export type PostShareInput = {
  commentary: string;
  articleUrl: string;
  articleTitle: string;
  articleDescription: string;
};

export type PostShareResult = {
  // null i dry-run (LinkedInPost.postUrn er @unique, NULL tillater flere rader);
  // ekte URN i live-modus.
  postUrn: string | null;
  dryRun: boolean;
};

export async function postShare(input: PostShareInput): Promise<PostShareResult> {
  const orgUrn = requireEnv("LINKEDIN_ORGANIZATION_URN");
  const apiVersion = process.env.LINKEDIN_API_VERSION ?? DEFAULT_API_VERSION;
  const dryRun = process.env.LINKEDIN_DRY_RUN === "1";

  const body = {
    author: orgUrn,
    commentary: input.commentary,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    content: {
      article: {
        source: input.articleUrl,
        title: input.articleTitle,
        description: input.articleDescription,
      },
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  if (dryRun) {
    console.log("[LinkedIn DRY_RUN] payload:", JSON.stringify(body, null, 2));
    return { postUrn: null, dryRun: true };
  }

  const token = await getAccessToken();

  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "LinkedIn-Version": apiVersion,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LinkedIn POST /rest/posts -> ${res.status}: ${text.slice(0, 500)}`);
  }

  const postUrn = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? "";
  if (!postUrn) {
    throw new Error("LinkedIn response missing x-restli-id header");
  }

  return { postUrn, dryRun: false };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const clientId = requireEnv("LINKEDIN_CLIENT_ID");
  const clientSecret = requireEnv("LINKEDIN_CLIENT_SECRET");
  const refreshToken = requireEnv("LINKEDIN_REFRESH_TOKEN");

  const form = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LinkedIn token refresh -> ${res.status}: ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  if (!json.access_token) {
    throw new Error("LinkedIn token response missing access_token");
  }

  cached = {
    token: json.access_token,
    expiresAt: now + Math.max(60_000, (json.expires_in ?? 3600) * 1000),
  };
  return cached.token;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v.trim();
}
