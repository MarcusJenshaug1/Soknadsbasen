import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Paginert/sokebar medlemsliste. Skalerer til mange tusen medlemmer.
 *
 * Query params:
 *   q:      søkestreng (matcher epost + navn, case-insensitive)
 *   status: "active" | "invited" | "suspended" | "all" (default: active+invited)
 *   role:   "admin" | "member" | "all"
 *   sort:   "recent" | "name" | "email" (default: recent)
 *   cursor: member.id for keyset pagination
 *   take:   page size (default 50, max 200)
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Ikke autentisert" }, { status: 401 });

  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const statusParam = url.searchParams.get("status") ?? "all";
  const roleParam = url.searchParams.get("role") ?? "all";
  const sort = url.searchParams.get("sort") ?? "recent";
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take") ?? 50)));

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
  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Ikke funnet" }, { status: 404 });
  }

  const statusFilter =
    statusParam === "all"
      ? { status: { in: ["active", "invited"] } }
      : { status: statusParam };
  const roleFilter = roleParam === "all" ? {} : { role: roleParam };
  const searchFilter = q
    ? {
        user: {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  const orderBy =
    sort === "name"
      ? [{ user: { name: "asc" as const } }, { id: "asc" as const }]
      : sort === "email"
        ? [{ user: { email: "asc" as const } }, { id: "asc" as const }]
        : [{ createdAt: "desc" as const }, { id: "desc" as const }];

  const [members, totalActive, totalInvited] = await Promise.all([
    prisma.orgMembership.findMany({
      where: { orgId: org.id, ...statusFilter, ...roleFilter, ...searchFilter },
      orderBy,
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        role: true,
        status: true,
        sharesDataWithOrg: true,
        createdAt: true,
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    }),
    prisma.orgMembership.count({ where: { orgId: org.id, status: "active" } }),
    prisma.orgMembership.count({ where: { orgId: org.id, status: "invited" } }),
  ]);

  const hasMore = members.length > take;
  const page = hasMore ? members.slice(0, take) : members;
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  return NextResponse.json({
    members: page,
    nextCursor,
    totalActive,
    totalInvited,
    callerRole: org.memberships[0].role,
  });
}
