import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  serverExternalPackages: ["pdfjs-dist", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/cv/share/[token]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "marcusjenshaug-web.vercel.app",
      },
    ],
  },
};

export default nextConfig;
