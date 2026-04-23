import { redirect } from "next/navigation";
import { getSessionWithAccess } from "@/lib/auth";

// Eneste jobb: blokker innloggede uten aktivt abonnement.
// Dedupes mot /app/layout via React.cache — ingen ekstra DB-kall.
export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn?redirect=/app");
  if (!session.hasAccess) redirect("/app/billing");
  return <>{children}</>;
}
