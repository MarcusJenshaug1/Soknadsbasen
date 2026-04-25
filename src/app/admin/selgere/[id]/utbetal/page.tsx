import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatNok, formatDateNb } from "@/lib/sales/format";
import { PayoutClient } from "./PayoutClient";

export const dynamic = "force-dynamic";

export default async function PayoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rep = await prisma.salesRepProfile.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!rep) notFound();

  const entries = await prisma.commissionEntry.findMany({
    where: { salesRepId: rep.userId, status: "eligible" },
    orderBy: { paidAt: "asc" },
    include: { org: { select: { displayName: true } } },
  });

  const total = entries.reduce((s, e) => s + e.amountCents, 0);

  return (
    <div className="space-y-5">
      <header>
        <Link href={`/admin/selgere/${rep.id}`} className="text-[12px] text-ink/55 hover:text-ink">
          ← {rep.user.name ?? rep.user.email}
        </Link>
        <h1 className="text-[20px] font-semibold tracking-tight mt-2">Utbetal provisjon</h1>
        <p className="text-[12px] text-ink/55 mt-1">
          Velg entries som skal markeres som utbetalt. Selger blir varslet automatisk.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-black/8 bg-surface px-6 py-12 text-center">
          <p className="text-[14px] font-medium">Ingen entries klare for utbetaling</p>
          <p className="text-[12px] text-ink/55 mt-1">
            Pending entries flyttes til 'eligible' av cron-jobben når 90-dagers clawback-vinduet
            er over OG kunden har minst 3 betalte fakturaer.
          </p>
        </div>
      ) : (
        <PayoutClient
          profileId={rep.id}
          entries={entries.map((e) => ({
            id: e.id,
            stripeInvoiceId: e.stripeInvoiceId,
            orgName: e.org.displayName,
            invoiceAmountCents: e.invoiceAmountCents,
            amountCents: e.amountCents,
            paidAt: formatDateNb(e.paidAt),
          }))}
          totalEligibleCents={total}
        />
      )}
    </div>
  );
}
