import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { weeklyGoal: true },
  });
  return NextResponse.json({ weeklyGoal: user?.weeklyGoal ?? null });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const body = (await req.json()) as { weeklyGoal?: number | null };
  const goal =
    body.weeklyGoal === null
      ? null
      : typeof body.weeklyGoal === "number" && body.weeklyGoal > 0
        ? Math.min(body.weeklyGoal, 100)
        : undefined;

  if (goal === undefined) {
    return NextResponse.json({ error: "Ugyldig verdi" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { weeklyGoal: goal },
  });
  return NextResponse.json({ weeklyGoal: goal });
}
