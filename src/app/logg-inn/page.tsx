import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/AuthSplit";

export default function LoggInnPage() {
  return (
    <Suspense fallback={null}>
      <AuthSplit focus="login" />
    </Suspense>
  );
}
