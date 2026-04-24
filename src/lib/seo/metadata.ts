import type { Metadata } from "next";
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

export function rootMetadata(): Metadata {
  return {
    metadataBase: siteUrl,
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.founder.name }],
    creator: siteConfig.founder.name,
    publisher: siteConfig.name,
    formatDetection: { email: false, telephone: false, address: false },
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#D5592E" },
      { media: "(prefers-color-scheme: dark)", color: "#D5592E" },
    ],
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: "black-translucent",
    },
    ...buildMetadata({ path: "/" }),
  };
}
