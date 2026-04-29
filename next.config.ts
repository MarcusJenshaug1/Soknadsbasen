import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  serverExternalPackages: ["pdfjs-dist", "puppeteer", "puppeteer-core", "@sparticuz/chromium"],
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
