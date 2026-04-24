import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  let body: { email: string; name?: string; role?: "user" | "admin" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig body" }, { status: 400 });
  }

  if (!body.email) {
    return NextResponse.json({ error: "E-post mangler" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().auth.admin.inviteUserByEmail(body.email, {
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.role === "admin" ? { isAdmin: true } : {}),
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/app`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
