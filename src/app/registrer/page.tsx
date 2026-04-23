import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/AuthSplit";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata = buildMetadata({
  path: "/registrer",
  title: "Opprett konto",
  noindex: true,
});

export default function RegistrerPage() {
  return (
    <Suspense fallback={null}>
      <AuthSplit focus="register" />
    </Suspense>
  );
}
