import { Skeleton } from "@/components/ui/Skeleton";

export default function JobDetailLoading() {
  return (
    <main className="max-w-[820px] mx-auto px-5 md:px-10 pb-24">
      <div className="pt-10 mb-8">
        <Skeleton className="h-3 w-56" />
      </div>

      <article>
        <header className="pb-8 border-b border-black/10">
          <Skeleton className="h-6 w-32 mb-4 rounded-full" />
          <Skeleton className="h-[48px] w-full max-w-[680px] mb-4" />
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-11 w-40 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-black/10 bg-white p-6 md:p-7">
          <Skeleton className="h-3 w-24 mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-2.5 w-20 mb-2" />
                  <Skeleton className="h-4 w-full max-w-[160px]" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-10 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </section>
      </article>
    </main>
  );
}
