/**
 * Token + JWT-helpers for collab-invite-flowen.
 *
 * Token (i URL): 12-byte base64url, samme generator som ResumeShareLink.
 * JWT (etter join): kortlevd HS256-signert med `COLLAB_JWT_SECRET`, brukes
 *   av Hocuspocus til å autorisere anonyme klienter på samme channel som
 *   eieren. Innholdet kobler en sesjon til en spesifikk invite + ressurs.
 */

import { SignJWT, jwtVerify } from "jose";
import { generateShareToken } from "@/lib/cvShareToken";

export { generateShareToken };

const COLLAB_JWT_ALG = "HS256";
const COLLAB_JWT_TTL_SECONDS = 60 * 60; // 1 time per token; klient join-er på nytt ved expiry.

export type CollabResourceKind = "cv" | "letter" | "application";

export interface CollabAnonClaims {
  /** sub-felt: `anon:<sessionId>`. */
  sub: string;
  inviteId: string;
  sessionId: string;
  resourceKind: CollabResourceKind;
  resourceId: string;
  displayName: string;
  role: "suggester";
}

function getSecret(): Uint8Array {
  const secret = process.env.COLLAB_JWT_SECRET;
  if (!secret) {
    throw new Error("COLLAB_JWT_SECRET er ikke satt i env");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign en anonym sesjon. Returnerer kompakt JWT-streng.
 */
export async function signCollabAnonJwt(claims: Omit<CollabAnonClaims, "sub" | "role">): Promise<string> {
  const payload: CollabAnonClaims = {
    ...claims,
    sub: `anon:${claims.sessionId}`,
    role: "suggester",
  };
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: COLLAB_JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(`${COLLAB_JWT_TTL_SECONDS}s`)
    .setIssuer("soknadsbasen-collab")
    .sign(getSecret());
}

/**
 * Validate en innkommende anonym JWT. Returnerer claims hvis gyldig,
 * kaster ellers.
 */
export async function verifyCollabAnonJwt(token: string): Promise<CollabAnonClaims> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: [COLLAB_JWT_ALG],
    issuer: "soknadsbasen-collab",
  });

  // Type-narrow + valider feltene vi forventer.
  const sub = payload.sub;
  const inviteId = payload.inviteId;
  const sessionId = payload.sessionId;
  const resourceKind = payload.resourceKind;
  const resourceId = payload.resourceId;
  const displayName = payload.displayName;
  const role = payload.role;

  if (
    typeof sub !== "string" ||
    typeof inviteId !== "string" ||
    typeof sessionId !== "string" ||
    (resourceKind !== "cv" && resourceKind !== "letter" && resourceKind !== "application") ||
    typeof resourceId !== "string" ||
    typeof displayName !== "string" ||
    role !== "suggester"
  ) {
    throw new Error("Invalid collab anon JWT shape");
  }

  return {
    sub,
    inviteId,
    sessionId,
    resourceKind,
    resourceId,
    displayName,
    role,
  };
}

/* ─── Rate-limit-buckets ─────────────────────────────────────── */

const joinBuckets = new Map<string, number[]>();
const suggestBuckets = new Map<string, number[]>();

const JOIN_WINDOW_MS = 5 * 60_000;
const JOIN_LIMIT = 10; // 10 join-forsøk per 5 min per token
const SUGGEST_WINDOW_MS = 60_000;
const SUGGEST_LIMIT = 30; // 30 forslag per minutt per sesjon

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

export function checkJoinRateLimit(token: string): boolean {
  return pruneAndCount(joinBuckets, token, JOIN_WINDOW_MS) < JOIN_LIMIT;
}

export function recordJoin(token: string): void {
  record(joinBuckets, token);
}

export function checkSuggestRateLimit(sessionId: string): boolean {
  return pruneAndCount(suggestBuckets, sessionId, SUGGEST_WINDOW_MS) < SUGGEST_LIMIT;
}

export function recordSuggest(sessionId: string): void {
  record(suggestBuckets, sessionId);
}

/* ─── TTL-presets ────────────────────────────────────────────── */

export const COLLAB_INVITE_TTL_OPTIONS = [
  { label: "24 timer", hours: 24 },
  { label: "7 dager", hours: 7 * 24 },
  { label: "30 dager", hours: 30 * 24 },
  { label: "Aldri", hours: null },
] as const;

export function ttlToExpiresAt(hours: number | null): Date | null {
  if (hours === null) return null;
  return new Date(Date.now() + hours * 60 * 60_000);
}
