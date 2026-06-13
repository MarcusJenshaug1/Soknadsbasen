import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// Next standalone-tracing kopierer kun package.json (ikke lib-filene) for
// serverExternalPackages som puppeteer-core, så /api/pdf krasjet med
// MODULE_NOT_FOUND på Coolify. Vi inkluderer derfor hele puppeteer-core sin
// dep-closure eksplisitt (utledet fra package-lock). Mangler en transitiv dep?
// Container-feilen navngir den — legg den til her.
const PDF_TRACE_INCLUDES = [
  "./node_modules/@sparticuz/chromium/bin/**",
  "./node_modules/puppeteer-core/**",
  "./node_modules/@puppeteer/**",
  "./node_modules/@types/yauzl/**",
  "./node_modules/agent-base/**",
  "./node_modules/bare-fs/**",
  "./node_modules/bare-path/**",
  "./node_modules/chromium-bidi/**",
  "./node_modules/cliui/**",
  "./node_modules/debug/**",
  "./node_modules/devtools-protocol/**",
  "./node_modules/escalade/**",
  "./node_modules/extract-zip/**",
  "./node_modules/get-caller-file/**",
  "./node_modules/get-stream/**",
  "./node_modules/http-proxy-agent/**",
  "./node_modules/https-proxy-agent/**",
  "./node_modules/lru-cache/**",
  "./node_modules/mitt/**",
  "./node_modules/ms/**",
  "./node_modules/pac-proxy-agent/**",
  "./node_modules/progress/**",
  "./node_modules/proxy-agent/**",
  "./node_modules/proxy-from-env/**",
  "./node_modules/pump/**",
  "./node_modules/require-directory/**",
  "./node_modules/semver/**",
  "./node_modules/socks-proxy-agent/**",
  "./node_modules/string-width/**",
  "./node_modules/tar-fs/**",
  "./node_modules/tar-stream/**",
  "./node_modules/typed-query-selector/**",
  "./node_modules/webdriver-bidi-protocol/**",
  "./node_modules/ws/**",
  "./node_modules/y18n/**",
  "./node_modules/yargs/**",
  "./node_modules/yargs-parser/**",
  "./node_modules/yauzl/**",
  "./node_modules/zod/**",
];

const nextConfig: NextConfig = {
  // Slankt selvstendig serveroutput for Docker/Coolify (.next/standalone).
  output: "standalone",
  poweredByHeader: false,
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.SOURCE_COMMIT ||
      `dev-${Date.now()}`,
  },
  serverExternalPackages: ["pdfjs-dist", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/pdf": PDF_TRACE_INCLUDES,
    "/api/cv/share/[token]/pdf": PDF_TRACE_INCLUDES,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/sammenligning/jobbe-ai",
        destination: "/sammenligning/lonna",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
