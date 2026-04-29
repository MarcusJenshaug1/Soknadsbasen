import { redirect } from "next/navigation";
import { getSessionWithAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "./ProfilForm";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  // getSessionWithAccess er cached fra /app/layout — dette er gratis.
  const session = await getSessionWithAccess();
  if (!session) redirect("/logg-inn");

  // Hent felter som ikke er i sesjons-shapen (avatarUrl, createdAt).
  const profile = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { avatarUrl: true, createdAt: true },
  });

  return (
    <ProfilForm
      initialUser={{
        id: session.userId,
        email: session.email,
        name: session.name,
        avatarUrl: profile?.avatarUrl ?? null,
        createdAt: profile?.createdAt ?? new Date(),
      }}
    />
  );
}
