import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok, formatDateNb, relativeNb } from "@/lib/sales/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Aktiv",
  trialing: "Prøvetid",
  past_due: "Forfalt",
  canceled: "Avsluttet",
  incomplete: "Ufullstendig",
};

const STATUS_COLOR: Record<string, string> = {
  active: "var(--success)",
  trialing: "var(--sales-stage-kontaktet)",
  past_due: "var(--sales-commission-eligible)",
  canceled: "var(--sales-stage-tapt)",
  incomplete: "var(--sales-commission-pending)",
};

const ENTRY_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  eligible: "Klar",
  paid: "Utbetalt",
  clawback: "Clawback",
  voided: "Annullert",
};

const ENTRY_STATUS_COLOR: Record<string, string> = {
  pending: "var(--sales-commission-pending)",
  eligible: "var(--sales-commission-eligible)",
  paid: "var(--sales-commission-paid)",
  clawback: "var(--sales-commission-clawback)",
  voided: "var(--sales-commission-pending)",
};

export default async function KundeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ setup?: string }>;
}) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/kunder");
  const { orgId } = await params;
  const sp = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      crmContacts: { orderBy: { createdAt: "desc" }, take: 10 },
      lead: { select: { id: true, stage: true } },
      memberships: { include: { user: { select: { name: true, email: true } } }, take: 20 },
      commissionEntries: {
        orderBy: { paidAt: "desc" },
        take: 10,
      },
    },
  });
  if (!org) notFound();
  if (access.viewerRole !== "admin" && org.salesRepId !== access.userId) notFound();

  const [totalCommission, ownInvoices] = await Promise.all([
    prisma.commissionEntry.aggregate({
      where: { orgId, status: { in: ["pending", "eligible", "paid"] } },
      _sum: { amountCents: true },
    }),
    prisma.commissionEntry.count({ where: { orgId } }),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link href="/selger/kunder" prefetch={true} className="text-[12px] text-ink/55 hover:text-ink">
            ← Mine kunder
          </Link>
          <h1 className="text-[20px] font-semibold tracking-tight mt-2 truncate">{org.displayName}</h1>
          <div className="flex items-center gap-3 text-[12px] text-ink/55 mt-1">
            <span className="font-mono">/{org.slug}</span>
            {org.orgNumber && (
              <>
                <span>·</span>
                <span className="font-mono">{org.orgNumber}</span>
              </>
            )}
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLOR[org.status] }} aria-hidden />
              {STATUS_LABEL[org.status] ?? org.status}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-ink/55">Opptjent provisjon</div>
          <div className="text-[18px] font-mono font-semibold">
            {formatNok(totalCommission._sum.amountCents ?? 0)}
          </div>
          <div className="text-[11px] text-ink/55 mt-0.5 font-mono">{ownInvoices} fakturaer</div>
        </div>
      </header>

      {sp.setup === "ok" && (
        <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/30 px-4 py-3 text-[12px]">
          <span className="font-medium">Stripe-checkout fullført ✓</span>{" "}
          <span className="text-ink/65">— provisjon registreres ved første betalte faktura.</span>
        </div>
      )}
      {sp.setup === "invoice" && (
        <div className="rounded-xl bg-[var(--sales-stage-kontaktet)]/10 border border-[var(--sales-stage-kontaktet)]/30 px-4 py-3 text-[12px]">
          <span className="font-medium">Faktura sendt</span>{" "}
          <span className="text-ink/65">— provisjon registreres når kunden betaler.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <section className="space-y-4">
          <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
            <h2 className="text-[13px] font-medium mb-3">Provisjons-historikk</h2>
            {org.commissionEntries.length === 0 ? (
              <p className="text-[12px] text-ink/55 py-3">Ingen provisjons-entries ennå. Registreres når Stripe markerer faktura som betalt.</p>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ink/55">
                    <th className="text-left py-1 font-medium">Faktura</th>
                    <th className="text-right py-1 font-medium">Beløp</th>
                    <th className="text-right py-1 font-medium">Provisjon</th>
                    <th className="text-right py-1 font-medium">Status</th>
                    <th className="text-right py-1 font-medium">Frigis</th>
                  </tr>
                </thead>
                <tbody>
                  {org.commissionEntries.map((e) => (
                    <tr key={e.id} className="border-t border-black/6 dark:border-white/6">
                      <td className="py-2 font-mono text-ink/55 truncate max-w-[120px]">{e.stripeInvoiceId}</td>
                      <td className="py-2 text-right font-mono">{formatNok(e.invoiceAmountCents)}</td>
                      <td className="py-2 text-right font-mono">{formatNok(e.amountCents)}</td>
                      <td className="py-2 text-right">
                        <span
                          className="inline-flex items-center gap-1 text-[10px]"
                          style={{ color: ENTRY_STATUS_COLOR[e.status] }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ENTRY_STATUS_COLOR[e.status] }} aria-hidden />
                          {ENTRY_STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-ink/55">
                        {e.status === "pending" ? formatDateNb(e.holdUntil) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
            <h2 className="text-[13px] font-medium mb-3">Medlemmer ({org.memberships.length})</h2>
            {org.memberships.length === 0 ? (
              <p className="text-[12px] text-ink/55">Ingen medlemmer registrert.</p>
            ) : (
              <ul className="space-y-1">
                {org.memberships.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-[12px] py-1">
                    <span className="flex-1 truncate">{m.user.name ?? m.user.email}</span>
                    <span className="text-[10px] text-ink/55 shrink-0">
                      {m.role} · {m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
            <h2 className="text-[13px] font-medium mb-3">Detaljer</h2>
            <dl className="text-[12px] space-y-1.5">
              <Row label="Lisenser">
                <span className="font-mono">{org.seatLimit}</span>
              </Row>
              <Row label="Fakturering">
                <span className="font-mono">{org.billingMethod === "invoice" ? "Faktura" : "Kort"}</span>
              </Row>
              <Row label="Opprettet">
                <span className="font-mono text-ink/65">{relativeNb(org.createdAt)}</span>
              </Row>
              {org.invoiceEmail && (
                <Row label="Faktura-epost">
                  <span className="font-mono text-ink/65 truncate max-w-[160px] inline-block">{org.invoiceEmail}</span>
                </Row>
              )}
              {org.lead && (
                <Row label="Lead">
                  <Link href={`/selger/leads/${org.lead.id}`} prefetch={true} className="text-[var(--accent)] hover:underline">
                    {org.lead.stage}
                  </Link>
                </Row>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
            <h2 className="text-[13px] font-medium mb-3">Kontakter</h2>
            {org.crmContacts.length === 0 ? (
              <p className="text-[12px] text-ink/55">Ingen kontakter ennå.</p>
            ) : (
              <ul className="space-y-2">
                {org.crmContacts.map((c) => (
                  <li key={c.id} className="text-[12px]">
                    <div className="font-medium">{c.name}</div>
                    {(c.title || c.email || c.phone) && (
                      <div className="text-[11px] text-ink/55 truncate font-mono">
                        {[c.title, c.email, c.phone].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink/55">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
