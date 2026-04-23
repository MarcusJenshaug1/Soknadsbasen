import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/access";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Velkommen – CV maker" };

export default async function VelkommenPage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/velkommen");
  if (await hasActiveAccess(session.userId)) redirect("/app");

  return (
    <Onboarding
      monthlyPriceId={process.env.STRIPE_PRICE_MONTHLY!}
      oneTimePriceId={process.env.STRIPE_PRICE_ONETIME!}
    />
  );
}
