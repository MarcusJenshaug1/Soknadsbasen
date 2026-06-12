import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listResumesFromPayload } from "@/lib/resume-server";

/**
 * Selektiv nullstilling av brukerdata per kategori. GET gir antall per
 * kategori (driver checkbox-oversikten), POST sletter valgte kategorier i
 * én transaksjon. Bekreftes med teksten NULLSTILL — ikke passord (dette er
 * reversibelt kun via at brukeren bygger opp igjen, men sletter ikke kontoen).
 */

const CATEGORIES = [
  "cv",
  "soknader",
  "soknadsbrev",
  "oppgaver",
  "lagredeSok",
  "selskaper",
  "kontakter",
  "sesjoner",
] as const;

export type ResetCategory = (typeof CATEGORIES)[number];

function isCategory(value: unknown): value is ResetCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const userId = session.userId;

  const [userData, soknader, soknadsbrev, oppgaver, lagredeSok, selskaper, kontakter, sesjoner] =
    await prisma.$transaction([
      prisma.userData.findUnique({ where: { userId }, select: { resumeData: true } }),
      prisma.jobApplication.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { application: { userId } } }),
      prisma.task.count({ where: { application: { userId } } }),
      prisma.savedSearch.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.contact.count({ where: { userId } }),
      prisma.jobSearchSession.count({ where: { userId } }),
    ]);

  return NextResponse.json({
    counts: {
      cv: listResumesFromPayload(userData?.resumeData).length,
      soknader,
      soknadsbrev,
      oppgaver,
      lagredeSok,
      selskaper,
      kontakter,
      sesjoner,
    },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }
  const userId = session.userId;

  let body: { categories?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  if (body.confirm !== "NULLSTILL") {
    return NextResponse.json(
      { error: "Skriv NULLSTILL for å bekrefte" },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(body.categories) ||
    body.categories.length === 0 ||
    !body.categories.every(isCategory)
  ) {
    return NextResponse.json({ error: "Ugyldige kategorier" }, { status: 400 });
  }

  const selected = new Set<ResetCategory>(body.categories);
  // Søknader cascader søknadsbrev/oppgaver — ikke slett dem dobbelt.
  if (selected.has("soknader")) {
    selected.delete("soknadsbrev");
    selected.delete("oppgaver");
  }

  await prisma.$transaction(async (tx) => {
    if (selected.has("cv")) {
      await tx.collabInvite.deleteMany({
        where: { ownerId: userId, resourceKind: "cv" },
      });
      await tx.resumeShareLink.deleteMany({ where: { userId } });
      // Cascader Section/SectionItem/ResumeVersion; JobApplication.
      // resumeSnapshotId nulles av FK-default (SetNull).
      await tx.resume.deleteMany({ where: { userId } });
      // CvYjsState mangler user-FK — én rad per bruker, keyet på User.id.
      await tx.cvYjsState.deleteMany({ where: { cvId: userId } });
      // Match-scorene er avledet av CV-en — ellers blir de stående stale.
      await tx.jobMatch.deleteMany({ where: { userId } });
      await tx.userData.updateMany({
        where: { userId },
        data: {
          resumeData: "{}",
          aiKeywords: [],
          aiKeywordsAt: null,
          aiKeywordsHash: null,
        },
      });
    }

    if (selected.has("soknader")) {
      await tx.collabInvite.deleteMany({
        where: { ownerId: userId, resourceKind: { in: ["letter", "application"] } },
      });
      // Cascader Task, Attachment, ApplicationActivity, CoverLetter,
      // InterviewStage. Storage-blobs bak Attachment ryddes ikke (paritet
      // med konto-sletting i DELETE /api/user).
      await tx.jobApplication.deleteMany({ where: { userId } });
      // winningApplicationId er en ren streng, ikke FK — null manuelt.
      await tx.jobSearchSession.updateMany({
        where: { userId },
        data: { winningApplicationId: null },
      });
      // Legacy-brev-bloben dekkes også av Søknader (UI-et lover det).
      await tx.userData.updateMany({
        where: { userId },
        data: { coverLetterData: "{}" },
      });
    }

    if (selected.has("soknadsbrev")) {
      await tx.coverLetter.deleteMany({ where: { application: { userId } } });
      await tx.collabInvite.deleteMany({
        where: { ownerId: userId, resourceKind: "letter" },
      });
      // Legacy-blob fra før brev ble per-søknad-rader.
      await tx.userData.updateMany({
        where: { userId },
        data: { coverLetterData: "{}" },
      });
    }

    if (selected.has("oppgaver")) {
      await tx.task.deleteMany({ where: { application: { userId } } });
    }

    if (selected.has("lagredeSok")) {
      await tx.savedSearch.deleteMany({ where: { userId } });
    }

    if (selected.has("selskaper")) {
      // JobApplication.companyId nulles av FK-default; denormalisert
      // companyName på søknadene beholdes med vilje.
      await tx.company.deleteMany({ where: { userId } });
    }

    if (selected.has("kontakter")) {
      await tx.contact.deleteMany({ where: { userId } });
    }

    if (selected.has("sesjoner")) {
      // JobApplication.sessionId nulles av FK-default (= «før sesjoner»-
      // data); sesjonsbundne delingslenker cascade-slettes.
      await tx.jobSearchSession.deleteMany({ where: { userId } });
    }
  });

  return NextResponse.json({ ok: true, reset: [...selected] });
}
