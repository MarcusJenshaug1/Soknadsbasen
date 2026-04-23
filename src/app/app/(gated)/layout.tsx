import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/access";

export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/app");
  if (!(await hasActiveAccess(session.userId))) {
    redirect("/app/billing");
  }
  return <>{children}</>;
}
