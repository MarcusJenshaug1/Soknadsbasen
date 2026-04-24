import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect(`/logg-inn?redirect=/org/${slug}`);

  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });

  if (!org || org.memberships.length === 0) notFound();

  return <>{children}</>;
}
