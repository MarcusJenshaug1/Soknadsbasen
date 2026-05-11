import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { LoginRedirectReader } from "@/components/auth/LoginRedirectReader";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/logg-inn",
  title: "Logg inn",
  noindex: true,
});

export default function LoggInnPage() {
  return (
    <Suspense fallback={<AuthSplit focus="login" redirect="/app" />}>
      <LoginRedirectReader />
    </Suspense>
  );
}
