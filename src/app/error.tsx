"use client";

import { ErrorFallback } from "@/components/ErrorFallback";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      retry={unstable_retry}
      homeHref="/"
      homeLabel="Til forsiden"
    />
  );
}
