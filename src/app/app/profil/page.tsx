import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfilForm } from "./ProfilForm";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getSession();
  if (!session) redirect("/logg-inn");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return (
    <ProfilForm
      initialUser={
        user ?? {
          id: session.userId,
          email: session.email,
          name: session.name,
          avatarUrl: null,
          createdAt: new Date(),
        }
      }
    />
  );
}
