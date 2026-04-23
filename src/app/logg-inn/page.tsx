import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/logg-inn",
  title: "Logg inn",
  noindex: true,
});

export default function LoggInnPage() {
  return (
    <Suspense fallback={null}>
      <AuthSplit focus="login" />
    </Suspense>
  );
}
