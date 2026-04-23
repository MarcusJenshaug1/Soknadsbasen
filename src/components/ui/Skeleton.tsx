import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-black/[0.06]",
        className,
      )}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-8 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-64" />
    </div>
  );
}
