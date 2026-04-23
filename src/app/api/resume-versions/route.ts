import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("resumeId");
  if (!resumeId) {
    return NextResponse.json({ error: "resumeId mangler" }, { status: 400 });
  }

  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      userId: session.userId,
    },
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json({
    versions:
      resume?.versions.map((version) => ({
        id: version.id,
        versionNum: version.versionNum,
        templateId: version.templateId,
        createdAt: version.createdAt,
        content: version.content,
      })) ?? [],
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  const body = (await request.json()) as {
    resumeId?: string;
    title?: string;
    templateId?: string;
    content?: unknown;
  };

  if (!body.resumeId || !body.content || !body.templateId) {
    return NextResponse.json({ error: "Manglende snapshot-data" }, { status: 400 });
  }

  const existingResume = await prisma.resume.findFirst({
    where: {
      id: body.resumeId,
      userId: session.userId,
    },
    include: {
      versions: {
        orderBy: { versionNum: "desc" },
        take: 1,
      },
    },
  });

  if (!existingResume) {
    await prisma.resume.create({
      data: {
        id: body.resumeId,
        userId: session.userId,
        title: body.title || "Min CV",
      },
    });
  } else if (body.title && body.title !== existingResume.title) {
    await prisma.resume.update({
      where: { id: existingResume.id },
      data: { title: body.title },
    });
  }

  const latestVersionNum = existingResume?.versions[0]?.versionNum ?? 0;
  const version = await prisma.resumeVersion.create({
    data: {
      resumeId: body.resumeId,
      versionNum: latestVersionNum + 1,
      templateId: body.templateId,
      content: body.content as never,
    },
  });

  return NextResponse.json({
    version: {
      id: version.id,
      versionNum: version.versionNum,
      templateId: version.templateId,
      createdAt: version.createdAt,
      content: version.content,
    },
  });
}
