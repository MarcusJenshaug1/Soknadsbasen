import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { NewLeadForm } from "./NewLeadForm";

export default async function NewLeadPage() {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/leads/ny");

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <Link href="/selger/leads" prefetch={true} className="text-[12px] text-ink/55 hover:text-ink">
          ← Leads
        </Link>
        <h1 className="text-[20px] font-semibold tracking-tight mt-2">Ny lead</h1>
        <p className="text-[12px] text-ink/55 mt-1">
          Registrer en ny prospekt-bedrift. Du kan legge til flere kontakter og aktiviteter senere.
        </p>
      </header>
      <NewLeadForm />
    </div>
  );
}
