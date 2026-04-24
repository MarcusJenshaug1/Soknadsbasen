import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/server";
import { toSlug } from "@/lib/org";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      displayName: true,
      status: true,
      stripeSubscriptionId: true,
      createdAt: true,
      _count: { select: { memberships: { where: { status: "active" } } } },
    },
  });

  return NextResponse.json({ orgs });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let body: {
    name: string;
    displayName: string;
    slug?: string;
    adminEmail: string;
    status?: string;
    logoUrl?: string;
    brandColor?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const { name, displayName, adminEmail } = body;
  if (!name?.trim() || !displayName?.trim() || !adminEmail?.trim()) {
    return NextResponse.json({ error: "Navn, visningsnavn og admin-epost er påkrevd" }, { status: 400 });
  }

  const slug = body.slug?.trim() || toSlug(name);
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Slug kan kun inneholde små bokstaver, tall og bindestrek" }, { status: 400 });
  }

  const normalizedEmail = adminEmail.trim().toLowerCase();

  const [existing, adminUser] = await Promise.all([
    prisma.organization.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }),
  ]);

  if (existing) return NextResponse.json({ error: "Slug er allerede i bruk" }, { status: 409 });

  let adminUserId: string;

  if (adminUser) {
    adminUserId = adminUser.id;
  } else {
    // Invite user via Supabase — creates auth account and sends invite email
    const { data: inviteData, error: inviteError } = await supabaseAdmin().auth.admin.inviteUserByEmail(
      normalizedEmail,
      { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/app` },
    );

    if (inviteError) {
      return NextResponse.json(
        { error: `Kunne ikke invitere bruker: ${inviteError.message}` },
        { status: 400 },
      );
    }

    // Pre-create Prisma profile so OrgMembership FK resolves immediately
    const newUser = await prisma.user.create({
      data: {
        id: inviteData.user.id,
        email: inviteData.user.email ?? normalizedEmail,
        name: null,
      },
      select: { id: true },
    });
    adminUserId = newUser.id;
  }

  const org = await prisma.organization.create({
    data: {
      slug,
      name: name.trim(),
      displayName: displayName.trim(),
      status: body.status ?? "active",
      ...(body.logoUrl?.trim() ? { logoUrl: body.logoUrl.trim() } : {}),
      ...(body.brandColor?.trim() ? { brandColor: body.brandColor.trim() } : {}),
    },
  });

  await prisma.orgMembership.create({
    data: { orgId: org.id, userId: adminUserId, role: "admin", status: "active" },
  });

  return NextResponse.json({ ok: true, slug: org.slug });
}
