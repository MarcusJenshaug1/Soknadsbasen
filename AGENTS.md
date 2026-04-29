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

## Sammenligning- og pris-sider er kontrakter (MÅ holdes i synk)

Disse filene er SEO-kontrakter, hver gang du legger til, fjerner eller endrer en feature, en pris, eller et integrasjons-punkt, må de oppdateres parallelt. Ellers påstår sammenligning-sidene ting som ikke er sant, og vi taper troverdighet i SERP.

**Kilder som må synkroniseres:**
- [src/lib/sammenligning/competitors.ts](src/lib/sammenligning/competitors.ts) — `comparisonTable`, `soknadsbasenStrengths`, `whenToChooseSoknadsbasen` per konkurrent
- [src/lib/cv-mal/industries.ts](src/lib/cv-mal/industries.ts) — bransje-tilpasninger
- [src/app/funksjoner/page.tsx](src/app/funksjoner/page.tsx) — `FEATURES`-array
- [src/app/priser/page.tsx](src/app/priser/page.tsx) — `PRICING_FAQ`
- [src/components/pricing/PricingCards.tsx](src/components/pricing/PricingCards.tsx) — `monthlyFeatures`, `oneTimeFeatures`
- [src/lib/seo/jsonld.ts](src/lib/seo/jsonld.ts) — `webApplicationJsonLd()` (featureList + offers)
- [src/lib/seo/siteConfig.ts](src/lib/seo/siteConfig.ts) — `pricing` og `description`
- [src/app/page.tsx](src/app/page.tsx) — landing FAQ + funksjons-grid (linje ~174-205)

**Sjekkliste før commit ved feature/pris-endring:**

1. **Ny feature lagt til?** Oppdater:
   - `competitors.ts` `comparisonTable` for ALLE 6 konkurrenter (legg til row med "yes" for soknadsbasen, riktig verdi for hver konkurrent)
   - `funksjoner/page.tsx` `FEATURES`-array (legg til ny seksjon eller utvid eksisterende)
   - `jsonld.ts` `webApplicationJsonLd().featureList` (legg til norsk navn)
   - `page.tsx` (landing) funksjons-grid hvis det er en hoved-feature

2. **Feature fjernet?** Fjern fra alle 8 filene over. Glemmer du én fil, lyver siden.

3. **Pris endret?** Oppdater:
   - `siteConfig.ts` `pricing.monthly`/`pricing.sixMonth`
   - `PricingCards.tsx` (tekst i kortene)
   - `priser/page.tsx` `PRICING_FAQ` ("Hva koster Søknadsbasen?")
   - `competitors.ts` "Pris (per måned)"-rader for ALLE konkurrenter
   - `page.tsx` (landing) FAQ ("Hva koster det?")
   - `jsonld.ts` `webApplicationJsonLd().offers` (price-felter)

4. **Ny konkurrent oppdaget?** Legg til i `competitors.ts` med full struktur. Oppdater også `competitors.ts`-importen i sitemap auto-fanger den.

5. **Konkurrent har ny feature vi ikke fanget?** Oppdater den konkurrentens `comparisonTable` (sett "yes"/"no"/"partial" på Søknadsbasen-kolonnen) og evt. `competitorStrengths`/`competitorWeaknesses`.

**Verifiser etter endring:**
```bash
npx tsc --noEmit
# Start dev-server, sjekk:
# - /sammenligning/[hver-slug] — comparison-tabellen viser de nye verdiene
# - /funksjoner — den nye feature-en vises
# - /priser — prising er konsistent
# - View Source på /, /priser, /funksjoner — webApplicationJsonLd inneholder oppdatert featureList og offers
```

**Hvorfor dette er kritisk:**
Sammenligning-sider er SEO-magneter for "X vs Y"-søk. En søker som klikker på "Søknadsbasen vs Jobbe.ai" og ser at vi påstår "AI-søknadsbrev: ja" mens vi faktisk har skrudd det av, vil aldri stole på oss igjen. Verre enn å ikke ha siden er å ha en løgnaktig side.
