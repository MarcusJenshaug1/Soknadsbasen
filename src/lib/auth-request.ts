import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/auth";

/**
 * Resolves a session from either cookies (standard web) or
 * an Authorization: Bearer <token> header (browser extension).
 *
 * Use this in API route handlers that should support both paths.
 */
export async function getSessionFromRequest(req: Request): Promise<SessionPayload | null> {
  // 1. Try cookie-based session first (standard Next.js flow)
  const cookieSession = await getSession();
  if (cookieSession) return cookieSession;

  // 2. Fall back to Bearer token (browser extension)
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  const profile = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { id: true, email: true, name: true },
  });
  if (!profile) return null;

  return { userId: profile.id, email: profile.email, name: profile.name };
}
