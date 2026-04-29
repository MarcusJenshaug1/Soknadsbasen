import { NextResponse, type NextRequest } from "next/server";

const APP_PATH_PREFIX = "/app";

/**
 * Edge cookie-sniff. Redirecter ikke-innloggede /app/**-treff til /logg-inn uten
 * å treffe Supabase eller Prisma. DB-validering av sesjonen ligger i layoutet
 * (Prisma er ikke edge-kompatibel uten egen adapter, og auth.getUser() er et
 * HTTP-kall vi vil unngå på edge for hver request).
 *
 * Når cookien finnes lar vi requesten passere; layoutet validerer og redirecter
 * hvis tokenen er utløpt eller mangler bruker-rad.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(APP_PATH_PREFIX)) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (hasAuthCookie) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/logg-inn";
  url.searchParams.set("redirect", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/app/:path*"],
};
