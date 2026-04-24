import { redirect } from "next/navigation";
import { getSessionWithAccess } from "@/lib/auth";
import { getActiveSession, createDefaultSession } from "@/lib/session-context";
import { SessionProvider } from "@/components/sessions/SessionProvider";
import { prisma } from "@/lib/prisma";

// Dedupes mot /app/layout via React.cache — ingen ekstra DB-kall.
export default async function GatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, activeJobSession] = await Promise.all([
    getSessionWithAccess(),
    getActiveSession(),
  ]);
  if (!session) redirect("/logg-inn?redirect=/app");
  if (!session.hasAccess) redirect("/app/billing");

  // Auto-opprett sesjon for nye brukere som aldri har hatt noen sesjon
  let resolvedSession = activeJobSession;
  if (!resolvedSession) {
    const count = await prisma.jobSearchSession.count({
      where: { userId: session.userId },
    });
    if (count === 0) {
      await createDefaultSession(session.userId);
      resolvedSession = await getActiveSession();
    }
  }

  return (
    <SessionProvider initialSession={resolvedSession}>
      {children}
    </SessionProvider>
  );
}
