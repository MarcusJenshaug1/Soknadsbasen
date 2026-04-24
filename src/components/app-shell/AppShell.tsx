import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { MobileSessionBar } from "@/components/sessions/MobileSessionBar";
import type { OrgContext } from "@/lib/auth";

export function AppShell({
  children,
  hasAccess,
  org = null,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
  org?: OrgContext | null;
}) {
  return (
    <div className="min-h-dvh bg-bg text-ink flex">
      <Sidebar hasAccess={hasAccess} org={org} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {hasAccess && <MobileSessionBar />}
        {children}
      </main>
      <BottomTabBar hasAccess={hasAccess} />
    </div>
  );
}
