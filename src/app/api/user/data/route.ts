import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// `debug.sessionEmail` brukes av useCloudSync som ground-truth for å fange
// cross-user CV-leak. Ikke fjern uten å oppdatere klient-sjekken samtidig.

/* ─── GET: Load user data from DB ─────────────────────────── */

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const row = await prisma.userData.findUnique({
    where: { userId: session.userId },
  });

  // Server-echo brukt av useCloudSync som ground-truth for å hindre at
  // cross-user CV-leak hydreres inn i editoren. Permanent defense, ikke fjern.
  const debug = { sessionEmail: session.email };

  if (!row) {
    return Response.json({ resumeData: null, coverLetterData: null, debug });
  }

  return Response.json({
    resumeData: safeJson(row.resumeData),
    coverLetterData: safeJson(row.coverLetterData),
    debug,
  });
}

/* ─── PUT: Save user data to DB ───────────────────────────── */

export async function PUT(request: Request) {
  return saveUserData(request);
}

/* ─── POST: Same as PUT (needed for navigator.sendBeacon) ── */

export async function POST(request: Request) {
  return saveUserData(request);
}

async function saveUserData(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  // Tidligere returnerte vi 403 under impersonering. Det er fjernet fordi
  // admin SKAL kunne hjelpe bruker med CV-en (samarbeids-scenario). Den
  // farlige cross-user-write (admins stale state lekker via beforeunload
  // ved impersonation-overgang) er stoppet av suspendCloudSync() i
  // BrukereClient/ImpersonationBanner FØR hard-nav. Skriv under
  // steady-state impersonation går nå riktig sted (target's userId).

  const body = await request.json();
  const { resumeData, coverLetterData } = body as {
    resumeData?: unknown;
    coverLetterData?: unknown;
  };

  // Merk: tidligere hadde vi en 422 her som avviste writes med
  // contact.email ≠ session.email. Den var for streng — mange brukere har
  // login-email forskjellig fra kontakt-email på CV-en (work vs. personal).
  // Cross-user-skrivebeskyttelsen ligger nå utelukkende i 403 ved aktiv
  // impersonering ovenfor, kombinert med /admin/cv-cleanup for å rydde
  // eksisterende korrumperte rader.

  // Build the update/create payload — only include fields that were sent
  const data: Record<string, string> = {};
  if (resumeData !== undefined) {
    data.resumeData = JSON.stringify(resumeData);
  }
  if (coverLetterData !== undefined) {
    data.coverLetterData = JSON.stringify(coverLetterData);
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Ingen data å lagre" }, { status: 400 });
  }

  await prisma.userData.upsert({
    where: { userId: session.userId },
    update: data,
    create: {
      userId: session.userId,
      resumeData: data.resumeData ?? "{}",
      coverLetterData: data.coverLetterData ?? "{}",
    },
  });

  return Response.json({ ok: true });
}

/* ─── Helpers ─────────────────────────────────────────────── */

function safeJson(raw: string): unknown {
  try {
    const parsed = JSON.parse(raw);
    // Return null for empty objects
    if (typeof parsed === "object" && parsed !== null && Object.keys(parsed).length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
