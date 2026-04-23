import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/user/account
 * Updates profile fields (name) and, when requested, email and/or password
 * via Supabase Auth.
 */
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    newPassword?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  const nextName = body.name?.trim() || null;
  const nextEmail = body.email?.trim().toLowerCase();
  const wantsEmailChange = !!nextEmail && nextEmail !== user.email;
  const wantsPasswordChange = !!body.newPassword;

  if (wantsPasswordChange && body.newPassword && body.newPassword.length < 8) {
    return NextResponse.json(
      { error: "Nytt passord må være minst 8 tegn" },
      { status: 400 },
    );
  }

  if (wantsEmailChange && nextEmail) {
    const existing = await prisma.user.findUnique({ where: { email: nextEmail } });
    if (existing && existing.id !== user.id) {
      return NextResponse.json(
        { error: "E-postadressen er allerede i bruk" },
        { status: 409 },
      );
    }
  }

  if (wantsEmailChange || wantsPasswordChange || nextName !== user.name) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.updateUser({
      ...(wantsEmailChange ? { email: nextEmail } : {}),
      ...(wantsPasswordChange ? { password: body.newPassword } : {}),
      ...(nextName !== user.name ? { data: { name: nextName } } : {}),
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: nextName,
      email: nextEmail ?? user.email,
    },
  });

  return NextResponse.json({
    user: { id: updated.id, email: updated.email, name: updated.name },
    message: wantsEmailChange
      ? "Konto oppdatert. Bekreft ny e-post via lenken du mottok."
      : "Kontoinnstillinger oppdatert",
  });
}
