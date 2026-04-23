import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });
  }

  try {
    const data = await req.json();

    if (!data.id) {
      // Create a new Resume owned by the authenticated user
      const resume = await prisma.resume.create({
        data: {
          title: `${data.contact?.firstName || "Ny"} sin CV`,
          userId: session.userId,
          versions: {
            create: {
              content: data,
              templateId: data.templateId ?? "default-template",
            },
          },
        },
      });
      return NextResponse.json({ id: resume.id, message: "Created new CV" });
    } else {
      // Autosave: overwrite the latest version to avoid row explosion during editing
      const latestVersion = await prisma.resumeVersion.findFirst({
        where: { resumeId: data.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestVersion) {
        await prisma.resumeVersion.update({
          where: { id: latestVersion.id },
          data: { content: data },
        });
      }
      return NextResponse.json({ id: data.id, message: "Updated CV" });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Kunne ikke lagre CV" }, { status: 500 });
  }
}
