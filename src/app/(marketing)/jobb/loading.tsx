import { Skeleton } from "@/components/ui/Skeleton";
import { JobListSkeleton, SidebarSkeleton } from "@/components/jobb/Skeletons";

export default function JobbListingLoading() {
  return (
    <main className="mx-auto max-w-[1280px] px-6 py-7 lg:px-10">
      <div className="mb-6">
        <Skeleton className="mb-2 h-9 w-72" />
        <Skeleton className="mb-5 h-4 w-96" />
        <Skeleton className="h-[52px] w-full max-w-[640px] rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-7 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <SidebarSkeleton />
        </div>
        <JobListSkeleton />
      </div>
    </main>
  );
}
