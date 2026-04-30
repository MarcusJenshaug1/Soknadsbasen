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

      <div className="rounded-2xl border border-black/10 bg-white p-4 md:p-5 mb-8 flex flex-wrap gap-3">
        <Skeleton className="h-10 flex-1 min-w-[200px]" />
        <Skeleton className="h-10 w-[180px]" />
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <ul className="space-y-3 mt-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border border-black/10 bg-white px-5 py-4 md:py-5"
          >
            <Skeleton className="h-5 w-2/3 mb-2.5" />
            <Skeleton className="h-3.5 w-1/3 mb-4" />
            <div className="flex gap-3">
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
