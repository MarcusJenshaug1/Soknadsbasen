import { Skeleton } from "@/components/ui/Skeleton";

// Dekker alle collab-delingsrutene (cv/letter/application). De er force-dynamic
// og gjør en token-validerende findUnique før render — denne skeleton-en gir en
// sentrert join-kort-placeholder så det ikke blir tom skjerm under streaming.
export default function Loading() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] rounded-3xl border border-black/8 dark:border-white/8 bg-surface p-6 space-y-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}
