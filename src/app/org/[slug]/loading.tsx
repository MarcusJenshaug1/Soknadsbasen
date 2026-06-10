import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

// Bart innhold: layoutet wrapper allerede children i max-w-5xl px-8 py-8.
export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
