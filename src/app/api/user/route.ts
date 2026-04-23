import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/user
 * GDPR account deletion. Re-verifies the current password via Supabase,
 * deletes the app-level rows, then removes the auth.users entry.
 */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  if (!body.password) {
    return NextResponse.json(
      { error: "Passord er påkrevd for å bekrefte sletting" },
      { status: 400 },
    );
  }

  const supabase = await supabaseServer();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: body.password,
  });
  if (reauthError) {
    return NextResponse.json({ error: "Feil passord" }, { status: 403 });
  }

  // Cascade-deletes handle Resume/Section/Version/Application/Task/etc.
  await prisma.user.delete({ where: { id: session.userId } });

  // Remove the Supabase auth user last — no way back after this.
  const admin = supabaseAdmin();
  await admin.auth.admin.deleteUser(session.userId);
  await supabase.auth.signOut();

  return NextResponse.json({ message: "Konto og alle data er slettet" });
}
