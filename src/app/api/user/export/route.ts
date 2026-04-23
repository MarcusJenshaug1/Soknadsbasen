import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/export
 * GDPR data export — returns all user data as a JSON file download.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  // Prisma types are correct (verified in generated index.d.ts) — TS server may cache stale types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).findUnique({
    where: { id: session.userId },
    include: {
      userData: true,
      resumes: {
        include: {
          sections: { include: { items: true } },
          versions: true,
        },
      },
      applications: {
        include: {
          tasks: true,
          activities: true,
          attachments: true,
          coverLetter: true,
        },
      },
      companies: true,
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  if (!user) {
    return NextResponse.json({ error: "Bruker ikke funnet" }, { status: 404 });
  }

  // Parse JSON blobs so export is fully readable — exclude password hash
  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    resumeData: safeJsonParse(user.userData?.resumeData),
    coverLetterData: safeJsonParse(user.userData?.coverLetterData),
    resumes: user.resumes,
    applications: user.applications,
    companies: user.companies,
  };

  const filename = `soknadsbasen-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function safeJsonParse(value: string | undefined | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
