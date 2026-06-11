import { Skeleton } from "@/components/ui/Skeleton";

export function SidebarSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <Skeleton className="mb-4 h-5 w-24" />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="border-b border-border py-3 last:border-b-0">
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

export function JobListSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-[34px] w-36 rounded-full" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface px-5 py-4">
          <div className="flex items-start gap-3.5">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-5 w-3/5" />
              <Skeleton className="mb-2.5 h-4 w-2/5" />
              <Skeleton className="h-[22px] w-48 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
