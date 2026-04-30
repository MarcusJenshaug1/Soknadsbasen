"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { LinkButton } from "@/components/ui/Button";
import { PricingCardButton } from "@/components/pricing/PricingCardButton";

function useLoggedIn(): boolean {
  return useAuthStore((s) => s.user !== null);
}

export function HeaderCTA() {
  const loggedIn = useLoggedIn();
  if (loggedIn) {
    return (
      <Link
        href="/app"
        className="text-[13px] px-4 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] hover:bg-[#a94424] transition-colors"
      >
        Åpne basen
      </Link>
    );
  }
  return (
    <>
      <Link
        href="/logg-inn"
        className="hidden sm:inline-flex text-[13px] px-3 py-2 text-[#14110e]/70 hover:text-[#14110e]"
      >
        Logg inn
      </Link>
      <Link
        href="/registrer"
        className="text-[13px] px-4 py-2 rounded-full bg-[#D5592E] text-[#faf8f5] hover:bg-[#a94424] transition-colors"
      >
        Kom i gang
      </Link>
    </>
  );
}

export function HeroCTA() {
  const loggedIn = useLoggedIn();
  return (
    <Link
      href={loggedIn ? "/app" : "/registrer"}
      className="px-6 py-3.5 rounded-full bg-[#D5592E] text-[#faf8f5] text-[14px] font-medium hover:bg-[#a94424] transition-colors"
    >
      {loggedIn ? "Åpne basen" : "Start din base"}
    </Link>
  );
}

export function ClosingCTA() {
  const loggedIn = useLoggedIn();
  return (
    <Link
      href={loggedIn ? "/app" : "/registrer"}
      className="inline-flex px-8 py-4 rounded-full bg-[#D5592E] text-[#faf8f5] text-[15px] font-medium hover:bg-[#a94424] transition-colors"
    >
      {loggedIn ? "Åpne basen" : "Start med 7 dager gratis"}
    </Link>
  );
}

type PricingSlotProps = {
  priceId: string;
  mode: "subscription" | "payment";
  label: string;
  variant?: "primary" | "inverse";
  signedOutHref?: string;
  signedOutLabel?: string;
};

export function PricingCTA({
  priceId,
  mode,
  label,
  variant = "primary",
  signedOutHref = "/registrer",
  signedOutLabel = "Kom i gang",
}: PricingSlotProps) {
  const loggedIn = useLoggedIn();
  if (loggedIn) {
    return <PricingCardButton priceId={priceId} mode={mode} label={label} />;
  }
  return (
    <LinkButton
      href={signedOutHref}
      size="lg"
      variant={variant === "inverse" ? "inverse" : undefined}
      className="w-full"
    >
      {signedOutLabel}
    </LinkButton>
  );
}
