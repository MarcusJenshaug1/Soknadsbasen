import { Suspense } from "react";
import { AuthSplit } from "@/components/auth/AuthSplit";

export default function RegistrerPage() {
  return (
    <Suspense fallback={null}>
      <AuthSplit focus="register" />
    </Suspense>
  );
}
