import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/components/AuthProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { JsonLdScript } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { rootMetadata, rootViewport } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/seo/siteConfig";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500"],
});

export const metadata = rootMetadata();
export const viewport = rootViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={siteConfig.language} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <JsonLdScript data={[organizationJsonLd(), websiteJsonLd()]} />
          <AuthProvider>{children}</AuthProvider>
          <ServiceWorkerRegistration />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
