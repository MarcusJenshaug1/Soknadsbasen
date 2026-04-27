import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase/server";

async function requireAdmin(email: string, userId: string) {
  if (email === process.env.ADMIN_EMAIL) return true;
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isAdmin: true } });
  return u?.role === "admin" || u?.isAdmin === true;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(session.email, session.userId))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const reps = await prisma.salesRepProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return NextResponse.json({ reps });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await requireAdmin(session.email, session.userId))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let body: {
    email: string;
    name?: string;
    commissionRateBp?: number;
    monthlyQuotaCents?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "Ugyldig e-post" }, { status: 400 });
  }

  const commissionRateBp = Math.max(0, Math.min(10000, Math.floor(body.commissionRateBp ?? 1000)));
  const monthlyQuotaCents = Math.max(0, Math.floor(body.monthlyQuotaCents ?? 0));

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, salesRepProfile: { select: { id: true } } },
  });

  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    if (existingUser.salesRepProfile) {
      return NextResponse.json({ error: "Selger-profil finnes allerede" }, { status: 409 });
    }
    if (existingUser.role !== "admin") {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: "selger" },
      });
    }
  } else {
    const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/selger`,
    });
    if (error) {
      return NextResponse.json({ error: `Invitasjon feilet: ${error.message}` }, { status: 400 });
    }
    const created = await prisma.user.create({
      data: {
        id: data.user.id,
        email: data.user.email ?? email,
        name: body.name?.trim() ?? null,
        role: "selger",
      },
      select: { id: true },
    });
    userId = created.id;
  }

  const profile = await prisma.salesRepProfile.create({
    data: {
      userId,
      commissionRateBp,
      monthlyQuotaCents,
      status: "active",
      inviteToken: crypto.randomUUID(),
      inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  });

  return NextResponse.json({ ok: true, profileId: profile.id, userId });
}
