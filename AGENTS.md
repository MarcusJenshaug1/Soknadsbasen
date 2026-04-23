<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Ytelses-regler (lærdom fra audit april 2026)

Appen kjører på Vercel (eu) mot Supabase Postgres i Stockholm via pgBouncer. Hver Prisma-rundtur = ~50–150 ms, hver Supabase `auth.getUser` = HTTP-kall. Disse reglene er der fordi forrige iterasjon hadde 6+ sekvensielle roundtrips per gated sidevisning.

## Auth + gating

- **Alltid `React.cache()` rundt server-side auth/DB-hjelpere** som kalles fra flere layouts/pages i samme request. Se `src/lib/auth.ts` og `src/lib/access.ts`. Uten cache kjøres hvert `getSession()`-kall på nytt = N roundtrips.
- **`getSessionWithAccess()` (`src/lib/auth.ts`) er standard i `/app/**`-layouts**. Den slår sammen user + subscription til **én** Prisma-query via `subscription`-relasjonen. Bruk `getSession()` + `hasActiveAccess()` kun i API-routes eller pages der du bare trenger ett av stykkene.
- **Duplikat-gating er ok så lenge alle kall er cache()-wrapped**. `/app/layout` + `/app/(gated)/layout` kaller begge `getSessionWithAccess()`; cache sørger for at andre kall er gratis.
- **Ikke legg auth i middleware uten edge-kompatibel DB-adapter.** Prisma er ikke edge-kompatibel uten `@prisma/adapter-*`. Middleware kan gjøre cookie-sniff + redirect, men DB-sjekken må bli i layout.

## Waterfalls — bruk Promise.all

- Alle server-komponenter som henter data fra flere uavhengige kilder **må** bruke `Promise.all`. Eksempel: `src/app/suksess/page.tsx` parallelliserer Stripe + Prisma. Sekvensielle `await`-linjer uten avhengighet er en bug.
- Stripe `retrieve` støtter `expand: ["subscription"]` — spar én rundtur ved å hente relaterte objekter i samme kall.

## Route-typer

- **Statiske landing-/info-sider (`/`, `/personvern`, `/vilkar`)** skal IKKE være `force-dynamic`. Session-avhengig UI flyttes til client islands som leser `useAuthStore`. Se `src/app/LandingCTAs.tsx` for mønster. Godta en kort flash ved hydrering — CDN-levering er verdt det.
- **`force-dynamic` bare når siden faktisk trenger fersk server-data per request.** Ikke bruk det som "default" — hver bruk fjerner CDN-cache.
- **`loading.tsx` på segment-root gir instant skeleton** under streaming. Én fil på `/app/(gated)/loading.tsx` dekker alle nested gated-ruter. Bruk [`Skeleton`](src/components/ui/Skeleton.tsx) for konsistens.

## Navigering (klient)

- **Alle `<Link>` i sidebar/tab-bar må ha `prefetch={true}`.** Default prefetch i Next 16 hopper over `force-dynamic`-ruter — uten eksplisitt prop vil dynamiske app-ruter IKKE prefetche.
- **Aldri `<a href="/...">` for intern nav.** Alltid `next/link`.

## Client bundles

- **Tunge editor-komponenter må dynamisk-importeres.** Lexical (`@lexical/*` × 8 pakker), framer-motion, Puppeteer-relatert kode. Mønster:
  ```ts
  const LexicalEditor = dynamic(
    () => import("./LexicalEditor").then((m) => m.LexicalEditor),
    { ssr: false, loading: () => <Skeleton className="h-40 w-full" /> },
  );
  ```
  Dynamic import med `ssr: false` krever **client-komponent som import-site** — ikke mulig fra server-komponent direkte. Wrap i en client-komponent hvis nødvendig.
- **`lucide-react` — named imports only**, aldri default/wildcard.
- **Zustand `persist`-middleware legger på bundle + localStorage-kostnad.** Bruk kun der state må overleve reload (f.eks. `useResumeStore`), ikke for session-state.

## Prisma

- **`prisma.ts` må være singleton** (global i dev, én instans i prod serverless). Se eksisterende mønster.
- **Nested `include`/`select` er én roundtrip.** Bruk relasjoner der mulig heller enn to separate `findUnique`-kall.
- **Ikke `findMany` uten `select`** — returnerer alle kolonner inkl. tunge JSON-blobs.
- **Connection pooling via pgBouncer** — `DATABASE_URL` må ha `pgbouncer=true&connection_limit=1` for serverless.

## Når du legger til en ny app-rute

Sjekkliste:
1. Trenger siden virkelig `force-dynamic`? Hvis ja → legg til `loading.tsx` i samme segment eller parent.
2. Data-henting med flere uavhengige kilder → `Promise.all`.
3. Bruk `getSessionWithAccess()` (i gated) eller `getSession()` (ellers) — aldri skriv ny auth-logikk.
4. Tunge klient-komponenter (editor, charts, canvas) → `next/dynamic` med skeleton-fallback.
5. Intern lenke → `<Link prefetch={true}>` i nav-komponenter.
6. `select` kun feltene du bruker i Prisma-kall.
