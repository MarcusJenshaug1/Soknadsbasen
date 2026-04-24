import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { OpprettOrgForm } from "./OpprettOrgForm";

export const metadata = { title: "Opprett organisasjon – Søknadsbasen" };

export default async function OpprettOrgPage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn?redirect=/org/opprett");

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <h1 className="text-[22px] font-semibold text-ink">Opprett organisasjon</h1>
          <p className="mt-2 text-[14px] text-ink/60">
            Kjøp seter til dine brukere. Du faktureres per aktiv bruker per måned.
          </p>
        </div>
        <OpprettOrgForm />
      </div>
    </div>
  );
}
