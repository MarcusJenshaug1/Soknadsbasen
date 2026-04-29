import type { Metadata, Viewport } from "next";
import { siteConfig, siteUrl, absoluteUrl } from "./siteConfig";

type BuildMetadataArgs = {
  path: string;
  title?: string;
  description?: string;
  ogImage?: string;
  ogImageAlt?: string;
  noindex?: boolean;
};

const DEFAULT_OG_IMAGE = "/og-default.png";

export function buildMetadata({
  path,
  title,
  description,
  ogImage,
  ogImageAlt,
  noindex,
}: BuildMetadataArgs): Metadata {
  const fullTitle = title
    ? `${title} | ${siteConfig.name}`
    : `${siteConfig.name}: ${siteConfig.tagline}`;
  const desc = description ?? siteConfig.description;
  const canonical = absoluteUrl(path);
  const image = ogImage ?? DEFAULT_OG_IMAGE;
  const imageAlt = ogImageAlt ?? fullTitle;

  const openGraph: NonNullable<Metadata["openGraph"]> = {
    type: "website",
    locale: siteConfig.locale,
    url: canonical,
    siteName: siteConfig.name,
    title: fullTitle,
    description: desc,
    images: [{ url: image, width: 1200, height: 630, alt: imageAlt }],
  };

  const twitter: NonNullable<Metadata["twitter"]> = {
    card: "summary_large_image",
    title: fullTitle,
    description: desc,
    images: [image],
  };

  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical },
    openGraph,
    twitter,
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        },
  };
}

export function rootViewport(): Viewport {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#D5592E" },
      { media: "(prefers-color-scheme: dark)", color: "#D5592E" },
    ],
  };
}

export function rootMetadata(): Metadata {
  const googleVerify = process.env.GOOGLE_SITE_VERIFICATION;
  const bingVerify = process.env.BING_SITE_VERIFICATION;
  const verification: NonNullable<Metadata["verification"]> = {};
  if (googleVerify) verification.google = googleVerify;
  if (bingVerify) verification.other = { "msvalidate.01": bingVerify };

  return {
    metadataBase: siteUrl,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.founder.name, url: absoluteUrl("/om") }],
    creator: siteConfig.founder.name,
    publisher: siteConfig.name,
    formatDetection: { email: false, telephone: false, address: false },
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: "black-translucent",
      startupImage: [
        {
          url: "/apple-splash?w=750&h=1334",
          media:
            "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=828&h=1792",
          media:
            "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1125&h=2436",
          media:
            "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1242&h=2688",
          media:
            "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1170&h=2532",
          media:
            "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1284&h=2778",
          media:
            "screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1179&h=2556",
          media:
            "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
        {
          url: "/apple-splash?w=1290&h=2796",
          media:
            "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
        },
      ],
    },
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
    ...buildMetadata({ path: "/" }),
  };
}
