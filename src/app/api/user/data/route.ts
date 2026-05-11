import { getSession, getImpersonationContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─── GET: Load user data from DB ─────────────────────────── */

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const imp = await getImpersonationContext();

  const row = await prisma.userData.findUnique({
    where: { userId: session.userId },
  });

  // Debug-felter brukt midlertidig for impersonation-bugjakt. Når Marcus har
  // bekreftet at impersonering fungerer skal disse fjernes.
  const debug = {
    sessionUserId: session.userId,
    sessionEmail: session.email,
    impTargetId: imp?.targetId ?? null,
    impAdminId: imp?.adminId ?? null,
  };

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

  // Read-only mens impersonering er aktiv. Forhindrer at en pending
  // beforeunload-/debounced save (fra admins fane eller fra /app under
  // impersonering) overskriver målbrukerens UserData med stale in-memory CV.
  const imp = await getImpersonationContext();
  if (imp) {
    return Response.json(
      { error: { code: "impersonation_read_only", message: "Skriv blokkert under impersonering" } },
      { status: 403 },
    );
  }

  const body = await request.json();
  const { resumeData, coverLetterData } = body as {
    resumeData?: unknown;
    coverLetterData?: unknown;
  };

  // Defensive: hvis innkommende resumeData har en contact.email satt som
  // ≠ sessionens email, er det sannsynligvis en cross-bruker lekkasje
  // (admins state som blir lagret som target's CV). Avvis lagringen.
  if (resumeData !== undefined) {
    const incomingEmail = extractIncomingCvEmail(resumeData);
    if (incomingEmail && incomingEmail.toLowerCase() !== session.email.toLowerCase()) {
      console.warn(
        `[user/data] avviser write: contact.email=${incomingEmail} ≠ session.email=${session.email}`,
      );
      return Response.json(
        {
          error: {
            code: "email_mismatch",
            message: "CV-data tilhører en annen bruker enn sesjonen",
          },
        },
        { status: 422 },
      );
    }
  }

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

/**
 * Plukk ut contact.email fra v1- og v2-resume-payloader. Brukes til
 * cross-user write-guard: hvis innkommende payload har en email satt
 * som ≠ sessionens email, er det en lekkasje, og raden lagres ikke.
 */
function extractIncomingCvEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  // v2: { resumes, activeResumeId, _resumeDataMap, data }
  if (
    p._resumeDataMap &&
    typeof p._resumeDataMap === "object" &&
    typeof p.activeResumeId === "string"
  ) {
    const map = p._resumeDataMap as Record<string, unknown>;
    const active = map[p.activeResumeId as string];
    const email = readContactEmail(active) ?? readContactEmail(p.data);
    return email;
  }

  // v1: { data }
  if (p.data) {
    return readContactEmail(p.data);
  }

  return readContactEmail(p);
}

function readContactEmail(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const contact = (node as Record<string, unknown>).contact;
  if (!contact || typeof contact !== "object") return null;
  const email = (contact as Record<string, unknown>).email;
  if (typeof email === "string" && email.trim()) return email.trim();
  return null;
}
