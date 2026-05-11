"use client";

import { useSearchParams } from "next/navigation";
import { AuthSplit } from "@/components/auth/AuthSplit";

/**
 * Isolerer `useSearchParams` til en liten Suspense-grense slik at
 * resten av AuthSplit-treet hydreres umiddelbart og login-knappen er
 * interaktiv fra første klikk.
 */
export function LoginRedirectReader() {
  const search = useSearchParams();
  const redirect = search.get("redirect") || "/app";
  return <AuthSplit focus="login" redirect={redirect} />;
}
