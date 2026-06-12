/**
 * Hocuspocus-server for Søknadsbasen CV-collab.
 *
 * Deployment: Hetzner Cloud CX22 i Falkenstein (eu-central). Bak Caddy
 * for TLS-terminering. Domene: collab.soknadsbasen.no.
 *
 * Auth: Supabase JWT validation via JWKS endpoint. Klienten sender sin
 * access_token i HocuspocusProvider.token. Vi verifiserer at sub (Supabase
 * userId) matcher CV-eieren — eller at brukeren har app_metadata.role=admin
 * (impersonering tillates).
 *
 * Persistens: Postgres via Prisma. Y.Doc binary lagres i cv_yjs_state,
 * og JSON-snapshot speiles til UserData.resumeData i samme transaksjon
 * så ikke-collab-konsumenter (PDF, AI, share-token) ser konsistent state.
 */

import "dotenv/config";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Logger } from "@hocuspocus/extension-logger";
import { PrismaClient } from "@prisma/client";
import { jwtVerify, createRemoteJWKSet } from "jose";
import * as Y from "yjs";
import {
  applyResumeToYDoc,
  yDocToResumePayload,
  type ResumePayloadV2,
} from "./shared/mapper.js";

const PORT = Number(process.env.PORT ?? 1234);
const SUPABASE_URL = required("SUPABASE_URL");
// Selvhostet Supabase (Coolify) signerer access-tokens med symmetrisk HS256 —
// JWKS-endepunktet kan ikke brukes da (jose avviser symmetriske nøkler i et
// key set). Med SUPABASE_JWT_SECRET satt verifiserer vi direkte mot secreten;
// uten faller vi tilbake til remote JWKS (hostet Supabase, asymmetrisk).
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;
const JWKS = JWT_SECRET
  ? null
  : createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

const prisma = new PrismaClient();

interface AuthContext {
  userId: string;
  cvOwnerId: string;
  isImpersonating: boolean;
}

const server = new Hocuspocus({
  port: PORT,
  // Hocuspocus debouncer for onStoreDocument-callbacks. Vi vil ikke
  // skrive til Postgres på hvert tastetrykk; 2 sek er en god balanse
  // mellom data-loss-window og DB-load.
  debounce: 2000,
  maxDebounce: 10000,

  async onAuthenticate(data) {
    const { token, documentName } = data;
    const cvOwnerId = parseDocName(documentName);
    if (!cvOwnerId) throw new Error("Invalid document name");
    if (!token) throw new Error("Missing auth token");

    const { payload } = JWT_SECRET
      ? await jwtVerify(token, JWT_SECRET, {
          issuer: `${SUPABASE_URL}/auth/v1`,
        })
      : await jwtVerify(token, JWKS!, {
          issuer: `${SUPABASE_URL}/auth/v1`,
        });
    const callerId = payload.sub;
    if (!callerId) throw new Error("Token missing sub");

    const meta = (payload.app_metadata as { role?: string } | undefined) ?? {};
    const isAdmin = meta.role === "admin";
    if (callerId !== cvOwnerId && !isAdmin) {
      throw new Error("Forbidden");
    }

    const context: AuthContext = {
      userId: callerId,
      cvOwnerId,
      isImpersonating: callerId !== cvOwnerId,
    };
    // Hocuspocus støtter å returnere context som blir tilgjengelig
    // i andre lifecycle-hooks (onChange, onStoreDocument etc.).
    return context;
  },

  extensions: [
    new Logger(),
    new Database({
      fetch: async ({ documentName }) => {
        const cvOwnerId = parseDocName(documentName);
        if (!cvOwnerId) return null;

        const row = await prisma.cvYjsState.findUnique({
          where: { cvId: cvOwnerId },
          select: { ydoc: true },
        });
        if (row) return new Uint8Array(row.ydoc);

        // Første gang dokumentet åpnes: seed Y.Doc fra eksisterende
        // JSON-snapshot i UserData.resumeData. Hvis brukeren ikke har
        // noen CV ennå, returner null så Hocuspocus oppretter en tom doc.
        const userData = await prisma.userData.findUnique({
          where: { userId: cvOwnerId },
          select: { resumeData: true },
        });
        if (!userData?.resumeData || userData.resumeData === "{}") return null;

        let json: ResumePayloadV2 | null = null;
        try {
          json = JSON.parse(userData.resumeData) as ResumePayloadV2;
        } catch (err) {
          console.warn(
            `[hocuspocus] kunne ikke parse resumeData for ${cvOwnerId}:`,
            err,
          );
          return null;
        }

        if (!json || !json.activeResumeId) return null;

        const ydoc = new Y.Doc();
        applyResumeToYDoc(ydoc, json);
        return Y.encodeStateAsUpdate(ydoc);
      },

      store: async ({ documentName, state, document }) => {
        const cvOwnerId = parseDocName(documentName);
        if (!cvOwnerId) return;

        const snapshot = yDocToResumePayload(document);

        // Atomisk: oppdater BÅDE binary Y.Doc og JSON-projeksjonen.
        // Hvis ett feiler, ruller begge tilbake — ingen drift.
        await prisma.$transaction([
          prisma.cvYjsState.upsert({
            where: { cvId: cvOwnerId },
            create: { cvId: cvOwnerId, ydoc: Buffer.from(state) },
            update: { ydoc: Buffer.from(state) },
          }),
          prisma.userData.upsert({
            where: { userId: cvOwnerId },
            create: {
              userId: cvOwnerId,
              resumeData: JSON.stringify(snapshot),
              coverLetterData: "{}",
            },
            update: {
              resumeData: JSON.stringify(snapshot),
            },
          }),
        ]);
      },
    }),
  ],
});

server.listen().then(() => {
  console.log(`[hocuspocus] listening on :${PORT}`);
});

/* ─── Helpers ─────────────────────────────────────────────── */

/** Dokument-navn på formatet `cv:<uuid>`. Returnerer uuid-en eller null. */
function parseDocName(documentName: string): string | null {
  if (!documentName.startsWith("cv:")) return null;
  const id = documentName.slice(3);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`[hocuspocus] missing required env: ${key}`);
    process.exit(1);
  }
  return v;
}

/* ─── Graceful shutdown ──────────────────────────────────── */

const shutdown = async (signal: string) => {
  console.log(`[hocuspocus] ${signal}, shutting down…`);
  try {
    await server.destroy();
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
