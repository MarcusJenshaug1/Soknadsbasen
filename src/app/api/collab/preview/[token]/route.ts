import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/collab/preview/[token]
 * Public preview-info for join-siden. Returnerer metadata (ressurstype,
 * eier-navn, label, expires) UTEN å opprette sesjon. Brukes til å
 * rendre JoinNameModal med kontekst ("Du er invitert til å hjelpe
 * Marcus med hans CV. Skriv navnet ditt:").
 *
 * Eksponerer kun displayName/email på eier, ingen sensitive felter.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Ugyldig token" }, { status: 400 });
  }

  const invite = await prisma.collabInvite.findUnique({
    where: { token },
    select: {
      id: true,
      resourceKind: true,
      resourceId: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      owner: { select: { name: true, email: true } },
    },
  });

  if (!invite || invite.revokedAt) {
    return NextResponse.json({ error: "Lenken er ikke gyldig" }, { status: 404 });
  }
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Lenken er utløpt" }, { status: 410 });
  }

  return NextResponse.json({
    resourceKind: invite.resourceKind,
    label: invite.label,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    owner: {
      // Returner first-name eller email-prefix for å minimere data-eksponering.
      displayName:
        invite.owner.name?.trim().split(/\s+/)[0] ??
        invite.owner.email.split("@")[0],
    },
  });
}
