import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { name, displayName } = body;
  if (!name?.trim() || !displayName?.trim()) {
    return NextResponse.json({ error: "Navn og visningsnavn er påkrevd" }, { status: 400 });
  }

  const slug = body.slug?.trim() || toSlug(name);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug kan kun inneholde små bokstaver, tall og bindestrek" },
      { status: 400 },
    );
  }

  const seatLimit = Math.max(1, Math.min(100, Number(body.seatLimit ?? 1)));
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
  if (existing) {
    return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 409 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const org = await prisma.organization.create({
    data: {
      slug,
      name: name.trim(),
      displayName: displayName.trim(),
      status: "incomplete",
      seatLimit,
      billingMethod,
      orgNumber: billingMethod === "invoice" ? body.orgNumber : null,
      invoiceEmail: billingMethod === "invoice" ? body.invoiceEmail : null,
    },
  });

  await prisma.orgMembership.create({
    data: { orgId: org.id, userId: session.userId, role: "admin", status: "active" },
  });

  const customerEmail = billingMethod === "invoice" ? body.invoiceEmail! : session.email;
  const customerId = await getOrCreateOrgCustomer(org.id, org.name, customerEmail);

  if (billingMethod === "invoice") {
    await stripe.customers.update(customerId, {
      email: body.invoiceEmail,
      invoice_settings: {
        custom_fields: [{ name: "Org.nr", value: body.orgNumber! }],
      },
    });
  }

  if (billingMethod === "invoice") {
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.STRIPE_PRICE_ORG_SEAT!, quantity: seatLimit }],
      collection_method: "send_invoice",
      days_until_due: 14,
      metadata: { orgId: org.id, type: "org" },
    });
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status: sub.status,
      },
    });
    return NextResponse.json({ url: `${origin}/org/${slug}?setup=invoice` });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ORG_SEAT!, quantity: seatLimit }],
    success_url: `${origin}/org/${slug}?setup=ok`,
    cancel_url: `${origin}/org/opprett`,
    allow_promotion_codes: true,
    metadata: { orgId: org.id, type: "org" },
    subscription_data: { metadata: { orgId: org.id, type: "org" } },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Mangler checkout-URL" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
