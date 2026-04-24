import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, getOrCreateOrgCustomer } from "@/lib/stripe/server";
import { toSlug } from "@/lib/org";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  let body: { name: string; displayName: string; slug?: string };
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
    return NextResponse.json({ error: "Slug kan kun inneholde små bokstaver, tall og bindestrek" }, { status: 400 });
  }

  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 409 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const org = await prisma.organization.create({
    data: { slug, name: name.trim(), displayName: displayName.trim(), status: "incomplete" },
  });

  await prisma.orgMembership.create({
    data: { orgId: org.id, userId: session.userId, role: "admin", status: "active" },
  });

  const customerId = await getOrCreateOrgCustomer(org.id, org.name, session.email);

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ORG_SEAT!, quantity: 1 }],
    success_url: `${origin}/org/${slug}?setup=ok`,
    cancel_url: `${origin}/org/opprett`,
    allow_promotion_codes: true,
    metadata: { orgId: org.id, type: "org" },
    subscription_data: { metadata: { orgId: org.id } },
  });

  if (!checkout.url) {
    return NextResponse.json({ error: "Mangler checkout-URL" }, { status: 500 });
  }

  return NextResponse.json({ url: checkout.url });
}
