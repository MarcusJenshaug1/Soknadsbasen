import { Skeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

// Bart innhold: admin-layoutet wrapper allerede children i max-w-4xl px-8 py-8.
// Én fil dekker alle admin-undersider (brukere, innboks, selgere, orger, ...).
export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
