import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/* ─── GET: Load user data from DB ─────────────────────────── */

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const row = await prisma.userData.findUnique({
    where: { userId: session.userId },
  });

  if (!row) {
    return Response.json({ resumeData: null, coverLetterData: null });
  }

  return Response.json({
    resumeData: safeJson(row.resumeData),
    coverLetterData: safeJson(row.coverLetterData),
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

  const body = await request.json();
  const { resumeData, coverLetterData } = body as {
    resumeData?: unknown;
    coverLetterData?: unknown;
  };

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

/* ─── Helper ──────────────────────────────────────────────── */

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
