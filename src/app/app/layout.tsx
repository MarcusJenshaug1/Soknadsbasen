import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell/AppShell";
import { HotKeyListener } from "@/components/HotKeyListener";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { getImpersonationContext, getSessionWithAccess } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Begge er React.cache-et; impersonasjons-konteksten er allerede slått opp
  // under session-resolusjonen, så dette koster ingen ekstra roundtrip.
  const [session, impersonation] = await Promise.all([
    getSessionWithAccess(),
    getImpersonationContext(),
  ]);
  if (!session) redirect("/logg-inn?redirect=/app");
  return (
    <>
      {impersonation ? (
        <ImpersonationBanner
          adminEmail={impersonation.adminEmail}
          targetEmail={session.email}
          targetName={session.name}
        />
      ) : null}
      <HotKeyListener />
      <AppShell
        hasAccess={session.hasAccess}
        org={session.org ?? null}
        isInternalAdmin={session.isInternalAdmin}
        isSalesRep={session.isSalesRep}
      >
        {children}
      </AppShell>
    </>
  );
}
