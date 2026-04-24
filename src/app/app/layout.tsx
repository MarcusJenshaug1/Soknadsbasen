import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell/AppShell";
import { getSessionWithAccess } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn?redirect=/app");
  return <AppShell hasAccess={session.hasAccess} org={session.org ?? null}>{children}</AppShell>;
}
