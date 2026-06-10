import { Skeleton } from "@/components/ui/Skeleton";

export default function JobbListingLoading() {
  return (
    <main className="max-w-[1100px] mx-auto px-5 md:px-10 pb-24">
      <div className="pt-10 mb-10">
        <Skeleton className="h-3 w-40" />
      </div>

      <section className="pt-6 md:pt-10 pb-10 max-w-[680px]">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-[60px] w-full mb-6" />
        <Skeleton className="h-4 w-full max-w-[560px] mb-2" />
        <Skeleton className="h-4 w-3/4 max-w-[420px]" />
      </section>

      <div className="rounded-2xl border border-black/10 bg-[#eee9df]/40 p-3 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
          <Skeleton className="h-11 w-full md:min-w-[220px]" />
          <Skeleton className="h-11 w-full md:w-[160px]" />
          <Skeleton className="h-11 w-full md:w-[180px]" />
          <Skeleton className="h-11 w-full md:w-[96px]" />
        </div>
      </div>

      <ul className="space-y-3 mt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border border-black/10 bg-white px-5 py-4 md:py-5 pr-16"
          >
            <div className="flex items-start gap-4 mb-3">
              <Skeleton className="size-10 shrink-0 rounded-2xl" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-[18px] w-2/3 mb-2" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
