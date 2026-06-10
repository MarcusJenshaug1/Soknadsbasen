import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

// Speiler ShareView-strukturen (sticky h-14-header + max-w-[1100px] main)
// så innholdet ikke hopper når siden streamer inn.
export default function Loading() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-8 md:py-12">
        <PageHeaderSkeleton />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
