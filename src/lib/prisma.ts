import { PrismaClient } from "@prisma/client";

/**
 * DATABASE_URL bærer connection_limit=1 — riktig for serverless (Vercel-
 * arven, én lambda = én connection), men FEIL på Coolify der én persistent
 * Node-prosess betjener all trafikk: parallelle queries (f.eks. /jobb-sidens
 * liste + facett-RPC + registre) køet på én tilkobling og ga P2024
 * pool-timeout → 504 under last (observert i prod 2026-06-12).
 *
 * Overstyrer til en fornuftig pool for persistent prosess. pgBouncer
 * (transaction mode, port 6543) multiplekser videre mot Postgres, så 15
 * klient-tilkoblinger er trygt. Endres URL-en i Coolify-env senere, vinner
 * fortsatt denne overstyringen — bevisst, så regresjonen ikke kan gjeninnføres.
 */
function poolTunedUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    url.searchParams.set("connection_limit", "15");
    url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: poolTunedUrl(),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
