import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glemt passord – Søknadsbasen",
  robots: { index: false, follow: false, nocache: true },
};

export default function GlemtPassordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
