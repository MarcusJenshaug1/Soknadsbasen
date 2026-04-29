import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <svg
        className="w-6 h-6"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        aria-hidden="true"
      >
        <path
          d="M10 3 C25 3 29 7 29 16 C29 25 25 29 16 29 L10 29 L3 22 L3 10 C3 6 5 3 10 3 Z"
          fill="#D5592E"
        />
        <path d="M3 22 L10 29 L3 29 Z" fill="#A94424" />
      </svg>
      <span className="font-medium tracking-tight text-[14px] text-ink">
        Søknadsbasen
      </span>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 border-r border-black/8 dark:border-white/8 flex-col p-6 bg-bg h-dvh sticky top-0 print:hidden">
      <div className="mb-12">
        <LogoMark />
      </div>
      <nav className="space-y-0.5 text-[13px] flex-1 flex flex-col">
        <div className="flex-1 space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-full" />
          ))}
        </div>
      </nav>
      <div className="border-t border-black/8 dark:border-white/8 pt-5 flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
    </aside>
  );
}

function BottomTabBarSkeleton() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur-md border-t border-black/8 dark:border-white/8 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] print:hidden"
      style={{
        paddingLeft: `max(1rem, env(safe-area-inset-left))`,
        paddingRight: `max(1rem, env(safe-area-inset-right))`,
      }}
      aria-hidden="true"
    >
      <ul className="grid grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex flex-col items-center gap-1 py-1">
            <Skeleton className="w-5 h-5 rounded-md" />
            <Skeleton className="h-2 w-8" />
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="min-h-dvh bg-bg text-ink flex">
      <SidebarSkeleton />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-[1000px] mx-auto px-5 md:px-10 py-6 md:py-10">
          <PageHeaderSkeleton />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
      <BottomTabBarSkeleton />
    </div>
  );
}
