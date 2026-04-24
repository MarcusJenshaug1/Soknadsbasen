import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe/server";

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL;
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !isAdmin(session.email)) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 403 });
  }

  const { id } = await ctx.params;
  await stripe.promotionCodes.update(id, { active: false });
  return NextResponse.json({ ok: true });
}
