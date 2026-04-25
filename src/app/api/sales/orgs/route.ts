import { NextResponse } from "next/server";
import { getSelgerPanelAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, getOrCreateOrgCustomer } from "@/lib/stripe/server";
import { toSlug } from "@/lib/org";

type Body = {
  name: string;
  displayName: string;
  slug?: string;
  seatLimit?: number;
  billingMethod?: "card" | "invoice";
  orgNumber?: string;
  invoiceEmail?: string;
  /// Hvis selger konverterer en eksisterende Lead, oppgis id her.
  leadId?: string;
  /// Hvis admin opprettet på vegne av annen selger, ellers selv.
  salesRepId?: string;
  /// Primary contact opprettes som CrmContact + OrgMembership invite.
  primaryContact?: {
    name?: string;
    email?: string;
    title?: string;
    phone?: string;
  };
};

export async function POST(req: Request) {
  const access = await getSelgerPanelAccess();
  if (!access) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const displayName = body.displayName?.trim() || name;
  if (!name) return NextResponse.json({ error: "Navn er påkrevd" }, { status: 400 });

  const slug = body.slug?.trim() || toSlug(name);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Ugyldig slug" }, { status: 400 });
  }

  const seatLimit = Math.max(1, Math.min(500, Number(body.seatLimit ?? 1)));
  const billingMethod: "card" | "invoice" = body.billingMethod === "invoice" ? "invoice" : "card";

  if (billingMethod === "invoice") {
    if (!body.orgNumber || !/^\d{9}$/.test(body.orgNumber)) {
      return NextResponse.json({ error: "Organisasjonsnummer må være 9 siffer" }, { status: 400 });
    }
    if (!body.invoiceEmail || !/.+@.+\..+/.test(body.invoiceEmail)) {
      return NextResponse.json({ error: "Ugyldig faktura-epost" }, { status: 400 });
    }
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 409 });

  // Bestem hvilken selger orgen attribueres til.
  let salesRepId = access.userId;
  if (access.viewerRole === "admin" && body.salesRepId) {
    const target = await prisma.salesRepProfile.findUnique({
      where: { userId: body.salesRepId },
      select: { userId: true },
    });
    if (target) salesRepId = target.userId;
  }

  // Hvis konvertering fra eksisterende lead — sjekk eierskap.
  let lead = null as Awaited<ReturnType<typeof prisma.lead.findUnique>> | null;
  if (body.leadId) {
    lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
    if (!lead) return NextResponse.json({ error: "Lead ikke funnet" }, { status: 404 });
    if (access.viewerRole !== "admin" && lead.salesRepId !== access.userId) {
      return NextResponse.json({ error: "Mangler tilgang til lead" }, { status: 403 });
    }
    if (lead.orgId) return NextResponse.json({ error: "Lead er allerede konvertert" }, { status: 409 });
    salesRepId = lead.salesRepId;
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  // Transaksjon: opprett Org + sett salesRepId + opprett/oppdater Lead + opprett Org-membership for primary contact
  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        slug,
        name,
        displayName: displayName!,
        status: "incomplete",
        seatLimit,
        billingMethod,
        orgNumber: billingMethod === "invoice" ? body.orgNumber : null,
        invoiceEmail: billingMethod === "invoice" ? body.invoiceEmail : null,
        salesRepId,
      },
    });

    if (lead) {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          stage: "Vunnet",
          probability: 100,
          orgId: org.id,
          closedAt: new Date(),
        },
      });
    } else {
      // Auto-Deal: retroaktiv Lead i Vunnet for alle direkte org-opprett.
      await tx.lead.create({
        data: {
          salesRepId,
          stage: "Vunnet",
          probability: 100,
          source: "manual",
          estimatedValueCents: 0,
          expectedSeats: seatLimit,
          title: name,
          companyName: name,
          orgId: org.id,
          closedAt: new Date(),
        },
      });
    }

    return org;
  });

  // Knytt primær-kontakt til CrmContact (opprettes utenfor txn for å unngå låsing)
  if (body.primaryContact?.name) {
    await prisma.crmContact.create({
      data: {
        orgId: result.id,
        name: body.primaryContact.name,
        email: body.primaryContact.email ?? null,
        phone: body.primaryContact.phone ?? null,
        title: body.primaryContact.title ?? null,
      },
    });
  }

  // Stripe-customer + checkout/invoice
  const customerEmail = billingMethod === "invoice"
    ? body.invoiceEmail!
    : body.primaryContact?.email ?? access.email;
  const customerId = await getOrCreateOrgCustomer(result.id, result.name, customerEmail);

  if (billingMethod === "invoice") {
    await stripe.customers.update(customerId, {
      email: body.invoiceEmail,
      invoice_settings: {
        custom_fields: [{ name: "Org.nr", value: body.orgNumber! }],
      },
    });
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ORG_SEAT!, quantity: seatLimit }],
      collection_method: "send_invoice",
      days_until_due: 14,
      metadata: { orgId: result.id, type: "org", salesRepId },
    });
    await prisma.organization.update({
      where: { id: result.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status: sub.status,
      },
    });
    return NextResponse.json({
      url: `${origin}/selger/kunder/${result.id}?setup=invoice`,
      orgId: result.id,
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ORG_SEAT!, quantity: seatLimit }],
    success_url: `${origin}/selger/kunder/${result.id}?setup=ok`,
    cancel_url: `${origin}/selger/kunder/ny${body.leadId ? `?leadId=${body.leadId}` : ""}`,
    allow_promotion_codes: true,
    metadata: { orgId: result.id, type: "org", salesRepId },
    subscription_data: { metadata: { orgId: result.id, type: "org", salesRepId } },
  });
  if (!checkout.url) return NextResponse.json({ error: "Mangler checkout-URL" }, { status: 500 });
  return NextResponse.json({ url: checkout.url, orgId: result.id });
}
