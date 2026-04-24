import { redirect } from "next/navigation";
import { getSessionWithAccess } from "@/lib/auth";
import { OrgInnstillingerBruker } from "./OrgInnstillingerBruker";

export default async function OrgInnstillingerPage() {
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn");

  if (!session.org) {
    return (
      <div className="p-6 md:p-10 max-w-xl mx-auto">
        <h1 className="text-[22px] font-semibold mb-4">Min organisasjon</h1>
        <p className="text-[14px] text-ink/60">
          Du er ikke tilknyttet noen organisasjon.
          Har du fått en invitasjonslenke? Bruk den for å bli med.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-xl mx-auto">
      <h1 className="text-[22px] font-semibold mb-8">Min organisasjon</h1>
      <OrgInnstillingerBruker org={session.org} />
    </div>
  );
}
