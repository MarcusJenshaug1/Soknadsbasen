import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCollabAnonJwt } from "@/lib/collabToken";
import { parseResumeById } from "@/lib/resume-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/collab/cv-data
 * Header: Authorization: Bearer <anon-JWT> (fra /api/collab/join).
 *
 * Returnerer eierens AKTIVE CV-snapshot (ResumeData) til en invitert
 * medhjelper for read-only visning. For cv-invitasjoner er JWT-claimet
 * resourceId lik eierens userId (se invite-route). Snapshotet holdes ferskt
 * av Hocuspocus.onStoreDocument som skriver UserData.resumeData ved hver lagring.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Mangler bearer-token" }, { status: 401 });
  }

  let claims;
  try {
    claims = await verifyCollabAnonJwt(auth.slice(7));
  } catch {
    return NextResponse.json({ error: "Ugyldig eller utløpt token" }, { status: 401 });
  }
  if (claims.resourceKind !== "cv") {
    return NextResponse.json({ error: "Ikke en CV-ressurs" }, { status: 400 });
  }

  const ownerId = claims.resourceId;
  const userData = await prisma.userData.findUnique({
    where: { userId: ownerId },
    select: {
      resumeData: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!userData) {
    return NextResponse.json({ error: "CV ikke funnet" }, { status: 404 });
  }

  // V2-wrapper: { data, activeResumeId, _resumeDataMap, resumes }. Hent den
  // aktive CV-en; fall tilbake til den legacy-syntetiske default-id-en.
  let activeId = "resume-default";
  try {
    const parsed = JSON.parse(userData.resumeData) as { activeResumeId?: string };
    if (parsed?.activeResumeId) activeId = parsed.activeResumeId;
  } catch {
    // bruker fallback-id
  }
  const data =
    parseResumeById(userData.resumeData, activeId) ??
    parseResumeById(userData.resumeData, "resume-default");
  if (!data) {
    return NextResponse.json({ error: "CV-en er tom" }, { status: 404 });
  }

  const ownerName =
    [data.contact?.firstName, data.contact?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    userData.user.name?.trim() ||
    userData.user.email.split("@")[0];

  return NextResponse.json({ data, ownerName });
}
