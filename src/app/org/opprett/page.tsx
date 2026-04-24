import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOrgSeatPrice } from "@/lib/stripe/pricing";
import { OpprettOrgForm } from "./OpprettOrgForm";

export const metadata = { title: "Opprett organisasjon – Søknadsbasen" };
export const dynamic = "force-dynamic";

export default async function OpprettOrgPage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/org/opprett");

  const price = await getOrgSeatPrice();
  const seatPriceNok = Math.round(price.amount / 100);

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-[22px] font-semibold text-ink">Opprett organisasjon</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Kjøp lisenser til dine brukere. Du betaler for antall lisenser du har, ikke hvor
            mange som er aktive.
          </p>
        </div>
        <OpprettOrgForm seatPriceNok={seatPriceNok} />
      </div>
    </div>
  );
}
