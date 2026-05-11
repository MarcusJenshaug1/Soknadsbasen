import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

/**
 * Identifiserer UserData-rader hvor stored CV-email
 * (resumeData.data.contact.email) ikke matcher User.email. Dette inkluderer
 * BÅDE faktisk impersonation-korrupsjon OG legitime brukere som har
 * separat login-email og CV-kontakt-email. Derfor må reset gjøres per rad
 * eller filtrert på spesifikk email-pattern, IKKE bulk på hele lista.
 *
 * GET = dry-run list (alle email-mismatch-rader, eller filtert på ?cvEmail=X)
 * DELETE = reset rader spesifisert i body { userIds: string[] }
 */

type CorruptRow = {
  userId: string;
  userEmail: string;
  userName: string | null;
  cvEmail: string | null;
  cvFirstName: string | null;
  cvLastName: string | null;
  updatedAt: string;
};

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const cvEmailFilter = url.searchParams.get("cvEmail");

  const rows = await findRows(cvEmailFilter);
  return NextResponse.json({ count: rows.length, rows });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: { userIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ugyldig body. Forventet { userIds: string[] }" },
      { status: 400 },
    );
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (userIds.length === 0) {
    return NextResponse.json(
      { error: "Forventet userIds-array med minst én id" },
      { status: 400 },
    );
  }

  // Safety: ALDRI reset admins egen rad. Selv hvis admin har email-mismatch
  // på sin egen CV (login != CV-kontakt) skal admin gjøre det manuelt.
  const filteredIds = userIds.filter((id) => id !== guard.userId);
  if (filteredIds.length !== userIds.length) {
    console.warn(`[cv-cleanup] admin=${guard.email} prøvde å reset egen rad — blokkert`);
  }

  if (filteredIds.length === 0) {
    return NextResponse.json({ count: 0, reset: 0, affected: [] });
  }

  // Hent rad-info FØR reset så vi kan returnere affected-liste
  const beforeReset = await fetchRowsByIds(filteredIds);

  const result = await prisma.userData.updateMany({
    where: { userId: { in: filteredIds } },
    data: { resumeData: "{}" },
  });

  console.warn(
    `[cv-cleanup] admin=${guard.email} resettet ${result.count} rader:`,
    beforeReset.map((r) => `${r.userEmail} (cv-eier var ${r.cvEmail})`).join(", "),
  );

  return NextResponse.json({
    count: beforeReset.length,
    reset: result.count,
    affected: beforeReset,
  });
}

async function findRows(cvEmailFilter: string | null): Promise<CorruptRow[]> {
  if (cvEmailFilter) {
    // Filtrert: bare rader hvor cv.email = cvEmailFilter (case-insensitive)
    // OG user.email != cvEmailFilter (ikke admin's egen rad om de har email match)
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT
        ud."userId",
        u.email AS user_email,
        u.name AS user_name,
        ud."resumeData"::jsonb #>> '{data,contact,email}' AS cv_email,
        ud."resumeData"::jsonb #>> '{data,contact,firstName}' AS cv_first_name,
        ud."resumeData"::jsonb #>> '{data,contact,lastName}' AS cv_last_name,
        ud."updatedAt"
      FROM "UserData" ud
      JOIN "User" u ON u.id = ud."userId"
      WHERE
        ud."resumeData" != '{}'
        AND lower(ud."resumeData"::jsonb #>> '{data,contact,email}') = lower(${cvEmailFilter})
        AND lower(u.email) != lower(${cvEmailFilter})
      ORDER BY ud."updatedAt" DESC
    `;
    return rows.map(rowToCorrupt);
  }

  // Ufiltret: alle email-mismatch-rader. NB: dette inkluderer legitime
  // tilfeller (jobb-login vs personlig CV-email), så ikke reset bulk.
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      ud."userId",
      u.email AS user_email,
      u.name AS user_name,
      ud."resumeData"::jsonb #>> '{data,contact,email}' AS cv_email,
      ud."resumeData"::jsonb #>> '{data,contact,firstName}' AS cv_first_name,
      ud."resumeData"::jsonb #>> '{data,contact,lastName}' AS cv_last_name,
      ud."updatedAt"
    FROM "UserData" ud
    JOIN "User" u ON u.id = ud."userId"
    WHERE
      ud."resumeData" != '{}'
      AND ud."resumeData"::jsonb #>> '{data,contact,email}' IS NOT NULL
      AND ud."resumeData"::jsonb #>> '{data,contact,email}' != ''
      AND lower(ud."resumeData"::jsonb #>> '{data,contact,email}') != lower(u.email)
    ORDER BY ud."updatedAt" DESC
  `;
  return rows.map(rowToCorrupt);
}

async function fetchRowsByIds(userIds: string[]): Promise<CorruptRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      ud."userId",
      u.email AS user_email,
      u.name AS user_name,
      ud."resumeData"::jsonb #>> '{data,contact,email}' AS cv_email,
      ud."resumeData"::jsonb #>> '{data,contact,firstName}' AS cv_first_name,
      ud."resumeData"::jsonb #>> '{data,contact,lastName}' AS cv_last_name,
      ud."updatedAt"
    FROM "UserData" ud
    JOIN "User" u ON u.id = ud."userId"
    WHERE ud."userId" = ANY(${userIds})
  `;
  return rows.map(rowToCorrupt);
}

type RawRow = {
  userId: string;
  user_email: string;
  user_name: string | null;
  cv_email: string | null;
  cv_first_name: string | null;
  cv_last_name: string | null;
  updatedAt: Date;
};

function rowToCorrupt(r: RawRow): CorruptRow {
  return {
    userId: r.userId,
    userEmail: r.user_email,
    userName: r.user_name,
    cvEmail: r.cv_email,
    cvFirstName: r.cv_first_name,
    cvLastName: r.cv_last_name,
    updatedAt: r.updatedAt.toISOString(),
  };
}
