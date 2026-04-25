import Link from "next/link";
import { redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewKundeForm } from "./NewKundeForm";

export const dynamic = "force-dynamic";

export default async function NewKundePage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string }>;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/kunder/ny");
  const params = await searchParams;
  const leadId = params.leadId;

  let leadPrefill = null;
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        contacts: {
          where: { isPrimary: true },
          include: { contact: true },
          take: 1,
        },
      },
    });
    if (lead && (access.viewerRole === "admin" || lead.salesRepId === access.userId)) {
      const primary = lead.contacts[0]?.contact ?? null;
      leadPrefill = {
        leadId: lead.id,
        companyName: lead.companyName,
        companyWebsite: lead.companyWebsite,
        expectedSeats: lead.expectedSeats,
        contactName: primary?.name ?? "",
        contactEmail: primary?.email ?? "",
        contactPhone: primary?.phone ?? "",
        contactTitle: primary?.title ?? "",
        stage: lead.stage,
      };
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <Link
          href={leadPrefill ? `/selger/leads/${leadPrefill.leadId}` : "/selger/kunder"}
          prefetch={true}
          className="text-[12px] text-ink/55 hover:text-ink"
        >
          ← {leadPrefill ? "Tilbake til lead" : "Kunder"}
        </Link>
        <h1 className="text-[20px] font-semibold tracking-tight mt-2">
          {leadPrefill ? "Konverter til kunde" : "Ny kunde"}
        </h1>
        {leadPrefill && (
          <div className="mt-3 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 px-3 py-2 text-[12px]">
            Konverterer fra <span className="font-medium">{leadPrefill.companyName}</span>{" "}
            <span className="text-ink/55">({leadPrefill.stage})</span>
          </div>
        )}
      </header>
      <NewKundeForm prefill={leadPrefill} />
    </div>
  );
}
