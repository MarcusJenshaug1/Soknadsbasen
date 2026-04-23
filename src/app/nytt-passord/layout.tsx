import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nytt passord – Søknadsbasen",
  robots: { index: false, follow: false, nocache: true },
};

export default function NyttPassordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
