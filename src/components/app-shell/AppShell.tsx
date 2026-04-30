import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { FirstLoadOverlay } from "./FirstLoadOverlay";
import { MobileSessionBar } from "@/components/sessions/MobileSessionBar";
import type { OrgContext } from "@/lib/auth";

export function AppShell({
  children,
  hasAccess,
  org = null,
  isInternalAdmin = false,
  isSalesRep = false,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  org?: OrgContext | null;
  isInternalAdmin?: boolean;
  isSalesRep?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-bg text-ink flex">
      <Sidebar
        hasAccess={hasAccess}
        org={org}
        isInternalAdmin={isInternalAdmin}
        isSalesRep={isSalesRep}
      />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {hasAccess && <MobileSessionBar />}
        {children}
      </main>
      <BottomTabBar hasAccess={hasAccess} />
      <FirstLoadOverlay />
    </div>
  );
}
