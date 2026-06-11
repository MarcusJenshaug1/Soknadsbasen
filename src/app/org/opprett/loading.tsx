import { Skeleton } from "@/components/ui/Skeleton";

// Speiler org-opprett-skjemaet så navigasjon ikke gir tom skjerm mens
// getOrgSeatPrice() (Stripe-kall) løses (siden er force-dynamic).
export default function Loading() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10 space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
