import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { MobileSessionBar } from "@/components/sessions/MobileSessionBar";

export function AppShell({
  children,
  hasAccess,
}: {
  children: React.ReactNode;
  hasAccess: boolean;
}) {
  return (
    <div className="min-h-dvh bg-[#faf8f5] text-[#14110e] flex">
      <Sidebar hasAccess={hasAccess} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        {hasAccess && <MobileSessionBar />}
        {children}
      </main>
      <BottomTabBar hasAccess={hasAccess} />
    </div>
  );
}
