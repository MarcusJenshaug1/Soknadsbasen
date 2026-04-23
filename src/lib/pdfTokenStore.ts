/**
 * In-memory one-time-use token store for server-side PDF generation.
 * When a user requests a PDF, the resume data is stored under a random token.
 * Puppeteer navigates to the print page with that token, which fetches the
 * data server-side and renders the CV. The token is consumed after first read.
 */

import { randomUUID } from "crypto";

interface TokenEntry {
  data: unknown;
  expires: number;
}

const store = new Map<string, TokenEntry>();
const TTL_MS = 60_000; // 1 minute

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expires < now) store.delete(key);
  }
}

/** Store resume data and return a one-time-use token */
export function storePdfData(data: unknown): string {
  cleanup();
  const token = randomUUID();
  store.set(token, { data, expires: Date.now() + TTL_MS });
  return token;
}

/** Retrieve and consume data for a token. Returns null if expired or not found. */
export function consumePdfData(token: string): unknown | null {
  cleanup();
  const entry = store.get(token);
  if (!entry) return null;
  store.delete(token); // one-time use
  return entry.data;
}
