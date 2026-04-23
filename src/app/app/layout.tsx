import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { getSessionWithAccess } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn?redirect=/app");
  return <AppShell hasAccess={session.hasAccess}>{children}</AppShell>;
}
