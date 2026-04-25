import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe/server";

type Body = {
  method: "card" | "invoice";
  orgNumber?: string;
  invoiceEmail?: string;
};

/**
 * Bytt betalingsmetode mellom kort (charge_automatically) og faktura (send_invoice).
 * Ved invoice kreves orgNumber (9 siffer) og invoiceEmail.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  if (body.method !== "card" && body.method !== "invoice") {
    return NextResponse.json({ error: "Ugyldig betalingsmetode" }, { status: 400 });
  }
  if (body.method === "invoice") {
    if (!body.orgNumber || !/^\d{9}$/.test(body.orgNumber)) {
      return NextResponse.json({ error: "Organisasjonsnummer må være 9 siffer" }, { status: 400 });
    }
    if (!body.invoiceEmail || !/.+@.+\..+/.test(body.invoiceEmail)) {
      return NextResponse.json({ error: "Ugyldig faktura-epost" }, { status: 400 });
    }
  }

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }
  if (org.memberships[0].role !== "admin") {
    return NextResponse.json({ error: "Krever admin-tilgang" }, { status: 403 });
  }
  if (!org.stripeCustomerId || !org.stripeSubscriptionId) {
    return NextResponse.json({ error: "Ingen Stripe-abonnement" }, { status: 400 });
  }

  if (body.method === "invoice") {
    await stripe.customers.update(org.stripeCustomerId, {
      email: body.invoiceEmail,
      invoice_settings: {
        custom_fields: [{ name: "Org.nr", value: body.orgNumber! }],
      },
    });
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      collection_method: "send_invoice",
      days_until_due: 14,
    });
  } else {
    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      collection_method: "charge_automatically",
    });
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      billingMethod: body.method,
      orgNumber: body.method === "invoice" ? body.orgNumber : null,
      invoiceEmail: body.method === "invoice" ? body.invoiceEmail : null,
    },
  });

  return NextResponse.json({ ok: true });
}
