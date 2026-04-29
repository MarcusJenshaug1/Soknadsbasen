/**
 * Build a public CV share URL with a Unicode (æøå) host instead of the
 * Punycode form (xn--…) that browsers expose via window.location.origin.
 * Recruiters paste the link into mail/chat — æøå version reads as Søknadsbasen,
 * not as cryptic xn--sknadsbasen-ggb.
 */
const PUNYCODE_HOST = "xn--sknadsbasen-ggb.no";
const UNICODE_HOST = "søknadsbasen.no";

export function prettyOrigin(origin: string): string {
  return origin.replace(PUNYCODE_HOST, UNICODE_HOST);
}

export function buildShareUrl(token: string): string {
  const origin =
    typeof window !== "undefined" ? prettyOrigin(window.location.origin) : "";
  return `${origin}/cv/delt/${token}`;
}
