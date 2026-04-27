import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNok } from "@/lib/sales/format";
import { stageMeta } from "@/lib/sales/stages";
import { StageEditor } from "./StageEditor";
import { LeadActivities } from "./LeadActivities";
import { LeadContacts } from "./LeadContacts";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await getSelgerPanelAccess();
  if (!access) redirect("/logg-inn?redirect=/selger/leads");
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      contacts: { include: { contact: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true, email: true } } },
      },
      org: { select: { id: true, slug: true, displayName: true, status: true } },
    },
  });
  if (!lead) notFound();
  if (access.viewerRole === "selger" && lead.salesRepId !== access.userId) notFound();

  const meta = stageMeta(lead.stage);
  const canConvert =
    !lead.orgId &&
    ["Forhandling", "Tilbud sendt", "Vunnet"].includes(lead.stage);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Link href="/selger/leads" prefetch={true} className="text-[12px] text-ink/55 hover:text-ink">
            ← Leads
          </Link>
          <h1 className="text-[20px] font-semibold tracking-tight mt-2 truncate">
            {lead.companyName}
          </h1>
          <div className="flex items-center gap-3 text-[12px] text-ink/55 mt-1">
            {lead.companyWebsite && (
              <a
                href={lead.companyWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink"
              >
                {new URL(lead.companyWebsite.startsWith("http") ? lead.companyWebsite : `https://${lead.companyWebsite}`).hostname}
              </a>
            )}
            <span>·</span>
            <span>Kilde: {lead.source}</span>
            {lead.org && (
              <>
                <span>·</span>
                <Link href={`/selger/kunder/${lead.org.id}`} prefetch={true} className="text-[var(--success)] hover:underline">
                  Aktiv kunde
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wide text-ink/55">Estimert verdi</div>
          <div className="text-[18px] font-mono font-semibold">
            {formatNok(lead.estimatedValueCents)}
          </div>
          <div className="text-[11px] text-ink/55 mt-0.5 font-mono">
            {lead.expectedSeats} {lead.expectedSeats === 1 ? "sete" : "seter"} · {lead.probability}%
          </div>
        </div>
      </header>

      <StageEditor leadId={lead.id} currentStage={lead.stage} canConvert={canConvert} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <LeadActivities
          leadId={lead.id}
          initial={lead.activities.map((a) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            content: a.content,
            dueAt: a.dueAt ? a.dueAt.toISOString() : null,
            completedAt: a.completedAt ? a.completedAt.toISOString() : null,
            durationMin: a.durationMin,
            createdAt: a.createdAt.toISOString(),
            createdBy: a.createdBy,
          }))}
        />
        <aside className="space-y-4">
          <section className="rounded-2xl border border-black/8 dark:border-white/8 bg-surface p-5">
            <h2 className="text-[13px] font-medium mb-3">Detaljer</h2>
            <dl className="text-[12px] space-y-1.5">
              <Row label="Stage">
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    background: `color-mix(in oklab, ${meta.color} 15%, transparent)`,
                    color: meta.color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} aria-hidden />
                  {meta.label}
                </span>
              </Row>
              <Row label="Sannsynlighet">
                <span className="font-mono">{lead.probability}%</span>
              </Row>
              <Row label="Forventede seter">
                <span className="font-mono">{lead.expectedSeats}</span>
              </Row>
              <Row label="Opprettet">
                <span className="font-mono text-ink/65">
                  {new Date(lead.createdAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </Row>
              {lead.closedAt && (
                <Row label="Lukket">
                  <span className="font-mono text-ink/65">
                    {new Date(lead.closedAt).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </Row>
              )}
            </dl>
            {lead.notes && (
              <div className="mt-4 pt-4 border-t border-black/6 dark:border-white/6">
                <div className="text-[10px] uppercase tracking-wide text-ink/55 mb-1">Notater</div>
                <p className="text-[12px] text-ink/75 whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </section>

          <LeadContacts
            leadId={lead.id}
            initial={lead.contacts.map((cl) => ({
              linkId: cl.id,
              role: cl.role,
              isPrimary: cl.isPrimary,
              contact: cl.contact,
            }))}
          />

          {canConvert && (
            <section className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-5">
              <h3 className="text-[13px] font-medium">Klar til å vinne?</h3>
              <p className="text-[12px] text-ink/65 mt-1">
                Konverter denne leaden til en aktiv org-konto. Provisjon starter ved første betaling.
              </p>
              <Link
                href={`/selger/kunder/ny?leadId=${lead.id}`}
                prefetch={true}
                className="mt-3 inline-block px-3 py-1.5 rounded-full bg-[var(--success)] text-white text-[12px] hover:opacity-90 transition-opacity"
              >
                Konverter til org →
              </Link>
            </section>
          )}
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
