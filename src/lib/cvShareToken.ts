import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * URL-safe random token for CV share links.
 * 12 bytes -> 16 base64url characters, ~96-bit entropy.
 */
export function generateShareToken(): string {
  return randomBytes(12).toString("base64url");
}

/**
 * Fire-and-forget view increment. Caller should NOT await.
 * Failures are logged and swallowed so a metrics hiccup never breaks the page.
 */
export function incrementViewCount(token: string): void {
  prisma.resumeShareLink
    .update({
      where: { token },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })
    .catch((err) => {
      console.warn("[cvShareToken] viewCount update failed:", err);
    });
}

/* ─── In-memory rate-limit helpers ───────────────────────────── */

const createBuckets = new Map<string, number[]>();
const pdfBuckets = new Map<string, number[]>();

function pruneAndCount(map: Map<string, number[]>, key: string, windowMs: number): number {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = map.get(key)?.filter((t) => t > cutoff) ?? [];
  map.set(key, arr);
  return arr.length;
}

function record(map: Map<string, number[]>, key: string): void {
  const arr = map.get(key) ?? [];
  arr.push(Date.now());
  map.set(key, arr);
}

const CREATE_WINDOW_MS = 60_000;
const CREATE_LIMIT = 5;
const PDF_WINDOW_MS = 24 * 60 * 60_000;
const PDF_LIMIT = 30;

export function checkCreateRateLimit(userId: string): boolean {
  return pruneAndCount(createBuckets, userId, CREATE_WINDOW_MS) < CREATE_LIMIT;
}

export function recordCreate(userId: string): void {
  record(createBuckets, userId);
}

export function checkPdfRateLimit(token: string): boolean {
  return pruneAndCount(pdfBuckets, token, PDF_WINDOW_MS) < PDF_LIMIT;
}

export function recordPdf(token: string): void {
  record(pdfBuckets, token);
}
