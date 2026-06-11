import { Skeleton } from "@/components/ui/Skeleton";

/** Skeleton inne i modal-rammen mens detalj-RSC-en streames. */
export default function QuickViewLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:py-14">
      <div aria-hidden className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-[640px] rounded-3xl border border-border bg-surface p-8 shadow-[0_30px_90px_-20px_rgba(20,17,14,0.4)]">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-4 w-32" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
        <Skeleton className="mt-6 h-28 w-full rounded-xl" />
        <Skeleton className="mt-6 h-20 w-full rounded-xl" />
        <Skeleton className="mt-6 h-11 w-64 rounded-full" />
      </div>
    </div>
  );
}
