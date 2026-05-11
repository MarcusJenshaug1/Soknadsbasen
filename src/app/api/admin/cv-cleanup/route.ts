import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

/**
 * Identifiserer og rydder opp i UserData-rader hvor stored CV-email
 * (resumeData.data.contact.email) ikke matcher User.email. Disse er
 * sannsynligvis korrumpert av tidligere impersonering-bug der admins
 * in-memory CV ble skrevet til target's rad via beforeunload-sendBeacon.
 *
 * GET = dry-run, list kandidater.
 * DELETE = reset `resumeData` til '{}' på korrupte rader. coverLetterData
 *          beholdes (har ikke samme korrupsjons-vektor).
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

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const rows = await findCorruptRows();
  return NextResponse.json({ count: rows.length, rows });
}

export async function DELETE() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const rows = await findCorruptRows();

  if (rows.length === 0) {
    return NextResponse.json({ count: 0, reset: 0, affected: [] });
  }

  const userIds = rows.map((r) => r.userId);

  // Reset KUN resumeData. coverLetterData er sannsynligvis trygt (ingen
  // tilsvarende beforeunload-skriv-bug der). Hvis vi vil rense det også
  // må vi legge til en separat sjekk.
  const result = await prisma.userData.updateMany({
    where: { userId: { in: userIds } },
    data: { resumeData: "{}" },
  });

  console.warn(
    `[cv-cleanup] admin=${guard.email} resettet ${result.count} korrupte CV-rader:`,
    rows.map((r) => `${r.userEmail} (cv-eier var ${r.cvEmail})`).join(", "),
  );

  return NextResponse.json({
    count: rows.length,
    reset: result.count,
    affected: rows,
  });
}

async function findCorruptRows(): Promise<CorruptRow[]> {
  // raw query fordi JSON-path-uttrykk på prisma er mer tungvint enn rå SQL.
  // resumeData er en JSON-streng (TEXT-kolonne), så vi caster først.
  const rows = await prisma.$queryRaw<
    Array<{
      userId: string;
      user_email: string;
      user_name: string | null;
      cv_email: string | null;
      cv_first_name: string | null;
      cv_last_name: string | null;
      updatedAt: Date;
    }>
  >`
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

  return rows.map((r) => ({
    userId: r.userId,
    userEmail: r.user_email,
    userName: r.user_name,
    cvEmail: r.cv_email,
    cvFirstName: r.cv_first_name,
    cvLastName: r.cv_last_name,
    updatedAt: r.updatedAt.toISOString(),
  }));
}
