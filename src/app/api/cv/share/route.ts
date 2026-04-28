import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { listResumesFromPayload } from "@/lib/resume-server";
import {
  generateShareToken,
  checkCreateRateLimit,
  recordCreate,
} from "@/lib/cvShareToken";

const DAY_MS = 24 * 60 * 60_000;
const ALLOWED_TTL = new Set([7, 30]);
const MAX_ACTIVE_LINKS = 20;

interface CreateBody {
  resumeId?: string;
  label?: string;
  ttlDays?: number | null;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const links = await prisma.resumeShareLink.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      resumeId: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      viewCount: true,
      lastViewedAt: true,
      createdAt: true,
    },
  });

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });
  const resumes = listResumesFromPayload(userData?.resumeData);
  const nameById = new Map(resumes.map((r) => [r.id, r.name]));

  return NextResponse.json({
    links: links.map((l) => ({
      ...l,
      resumeName: nameById.get(l.resumeId) ?? null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  if (!(await hasActiveAccess(session.userId))) {
    return NextResponse.json(
      { error: "Krever aktivt abonnement", redirect: "/app/billing" },
      { status: 402 },
    );
  }

  if (!checkCreateRateLimit(session.userId)) {
    return NextResponse.json(
      { error: "For mange forsøk, prøv igjen om litt" },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  const resumeId = body.resumeId?.trim();
  if (!resumeId) {
    return NextResponse.json({ error: "Mangler resumeId" }, { status: 400 });
  }
  const ttlDays = body.ttlDays ?? null;
  if (ttlDays !== null && !ALLOWED_TTL.has(ttlDays)) {
    return NextResponse.json(
      { error: "Ugyldig utløp (tillatt: 7, 30, eller null)" },
      { status: 400 },
    );
  }

  const userData = await prisma.userData.findUnique({
    where: { userId: session.userId },
    select: { resumeData: true },
  });
  const validIds = new Set(listResumesFromPayload(userData?.resumeData).map((r) => r.id));
  if (!validIds.has(resumeId)) {
    return NextResponse.json(
      { error: "CV-en finnes ikke" },
      { status: 400 },
    );
  }

  const now = new Date();
  const activeCount = await prisma.resumeShareLink.count({
    where: {
      userId: session.userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  if (activeCount >= MAX_ACTIVE_LINKS) {
    return NextResponse.json(
      { error: `Maks ${MAX_ACTIVE_LINKS} aktive lenker. Tilbakekall gamle først.` },
      { status: 429 },
    );
  }

  const link = await prisma.resumeShareLink.create({
    data: {
      userId: session.userId,
      resumeId,
      token: generateShareToken(),
      label: body.label?.trim() || null,
      expiresAt: ttlDays ? new Date(Date.now() + ttlDays * DAY_MS) : null,
    },
    select: {
      id: true,
      token: true,
      resumeId: true,
      label: true,
      expiresAt: true,
      revokedAt: true,
      viewCount: true,
      lastViewedAt: true,
      createdAt: true,
    },
  });
  recordCreate(session.userId);

  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Mangler token" }, { status: 400 });
  }

  const result = await prisma.resumeShareLink.updateMany({
    where: { userId: session.userId, token, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
