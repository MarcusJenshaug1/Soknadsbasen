import { Skeleton } from "@/components/ui/Skeleton";

// Speiler SharedResumeView (sticky h-14-header + max-w-[1100px] CV-flate).
export default function Loading() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-black/8 dark:border-white/8">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-8">
        <Skeleton className="mx-auto h-[70dvh] w-full max-w-[800px] rounded-xl" />
      </div>
    </div>
  );
}
