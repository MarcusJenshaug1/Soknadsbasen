import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrgNav } from "./OrgNav";

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
      displayName: true,
      logoUrl: true,
      brandColor: true,
      memberships: {
        where: { userId: session.userId, status: "active" },
        select: { role: true },
      },
    },
  });
  if (!org || org.memberships.length === 0) notFound();

  const isAdmin = org.memberships[0].role === "admin";

  return (
    <div className="min-h-dvh bg-[#f9f9f8] flex">
      <aside className="w-[220px] shrink-0 border-r border-black/8 flex flex-col bg-bg sticky top-0 h-dvh">
        <div className="px-5 py-5 border-b border-black/6">
          <div className="flex items-center gap-2.5 min-w-0">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt=""
                className="w-6 h-6 rounded object-contain shrink-0"
              />
            ) : (
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
                style={{ backgroundColor: org.brandColor ?? "#0f0f0f" }}
              >
                {org.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[13px] font-semibold truncate">{org.displayName}</span>
          </div>
        </div>

        <OrgNav slug={slug} isAdmin={isAdmin} />

        <div className="px-3 py-4 border-t border-black/6">
          <Link
            href="/app"
            prefetch
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-ink/40 hover:text-ink hover:bg-black/5 transition-colors"
          >
            ← Tilbake til appen
          </Link>
          <div className="px-3 mt-2">
            <p className="text-[11px] text-ink/30 truncate">{session.email}</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
