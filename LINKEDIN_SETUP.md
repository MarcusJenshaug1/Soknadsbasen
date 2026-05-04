# LinkedIn auto-poster: engangs-oppsett

Denne fila beskriver det manuelle oppsettet du må gjøre én gang før `/api/cron/linkedin-jobs` kan poste til Søknadsbasens LinkedIn Page.

Koden er allerede på plass. Når stegene under er fullført og env-vars er satt i Vercel, vil cron-jobben (mandag-fredag 09:00 norsk tid) plukke 3 utvalgte stillinger og publisere dem.

## 1. Opprett LinkedIn Page

1. Gå til https://www.linkedin.com/company/setup/new/
2. Velg "Small business" (under 200 ansatte).
3. Page-navn: `Søknadsbasen`. URL-handle: `soknadsbasen` eller `søknadsbasen` (LinkedIn aksepterer ikke æøå, så bruk ASCII).
4. Bransje: `Internet Publishing` eller `Online Media`.
5. Logo + tagline.
6. Etter publisering: gå til Page Admin View, kopier ID-en fra URL-en (`/company/12345678/admin`).
7. Organization URN = `urn:li:organization:12345678`.

## 2. Opprett Developer App

1. Gå til https://developer.linkedin.com/ → Create App.
2. App-navn: `Søknadsbasen Auto-Poster`.
3. LinkedIn Page: velg Page-en du opprettet i steg 1.
4. Last opp logo, godta vilkår.
5. Etter opprettelse: gå til **Auth**-fanen, kopier:
   - Client ID → `LINKEDIN_CLIENT_ID`
   - Client Secret → `LINKEDIN_CLIENT_SECRET`
6. Sett **Authorized redirect URL** til `https://localhost:8080/callback` (kun brukt under engangs-token-henting).

## 3. Søk om Community Management API

`w_organization_social` scope krever produktet **"Community Management API"**.

1. I App-en din: **Products**-fanen → "Community Management API" → Request access.
2. Fyll skjema (forklar use case: "Automatisk publisering av norske ledige stillinger fra NAV-feed til vår egen Page").
3. Godkjenning tar typisk 5-15 dager. LinkedIn sender e-post.

Inntil godkjenning kan du teste med `LINKEDIN_DRY_RUN=1` (logger payload uten å POST-e).

## 4. Hent refresh token (engangsmanuell flow)

Når API er godkjent:

### 4a. Bygg auth URL

```
https://www.linkedin.com/oauth/v2/authorization
  ?response_type=code
  &client_id=DIN_CLIENT_ID
  &redirect_uri=https://localhost:8080/callback
  &state=randomstring
  &scope=w_organization_social%20r_organization_social%20rw_organization_admin
```

Lim i nettleser, logg inn, godkjenn. Du blir redirectet til `https://localhost:8080/callback?code=XXX&state=...` (siden vil ikke laste, det er ok).

Kopier `code`-parameteren fra URL-en.

### 4b. Bytt code mot tokens

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -d grant_type=authorization_code \
  -d code=COPIED_CODE \
  -d redirect_uri=https://localhost:8080/callback \
  -d client_id=DIN_CLIENT_ID \
  -d client_secret=DIN_CLIENT_SECRET
```

Response inneholder `access_token`, `refresh_token`, `expires_in`, `refresh_token_expires_in` (~365 dager).

Kopier `refresh_token` → `LINKEDIN_REFRESH_TOKEN`.

## 5. Sett env-vars

I Vercel project settings (Environment: Production + Preview):

| Var | Verdi |
|-----|-------|
| `LINKEDIN_CLIENT_ID` | fra steg 2 |
| `LINKEDIN_CLIENT_SECRET` | fra steg 2 |
| `LINKEDIN_REFRESH_TOKEN` | fra steg 4b |
| `LINKEDIN_ORGANIZATION_URN` | `urn:li:organization:12345678` (fra steg 1) |
| `LINKEDIN_API_VERSION` | `202504` (eller siste stabil) |

For lokal test: legg samme i `.env.local`. Sett evt. `LINKEDIN_DRY_RUN=1` for å logge uten å poste.

## 6. Smoke-test

Lokalt med dry-run:
```bash
LINKEDIN_DRY_RUN=1 pnpm dev
# I egen terminal:
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/linkedin-jobs
```

Sjekk JSON-respons og console-logg. Forventet: 3 kandidater med scores, full payload printet, status `skipped-dryrun`.

Live-test (etter env satt i Vercel):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://xn--sknadsbasen-ggb.no/api/cron/linkedin-jobs
```

Sjekk LinkedIn Page → 3 nye poster med 60s spacing.

## 7. Vedlikehold

- **Refresh token utløper etter 365 dager.** Sett kalenderpåminnelse, gjenta steg 4 årlig.
- **API-versjon (`LINKEDIN_API_VERSION`)** roterer kvartalsvis. Følg https://learn.microsoft.com/en-us/linkedin/marketing/versioning og bump når en versjon nærmer seg sunset.
- **Sjekk `LinkedInPost.status="failed"`-rader** ukentlig:
  ```sql
  SELECT * FROM "LinkedInPost" WHERE status = 'failed' ORDER BY "postedAt" DESC LIMIT 20;
  ```
  Vanlige feil: token utløpt, rate-limit, ugyldig orgnr.

## 8. Justeringer

- **Bump posts/dag:** Endre `?limit=5` i cron-URL eller default i [src/app/api/cron/linkedin-jobs/route.ts](src/app/api/cron/linkedin-jobs/route.ts).
- **Flere cron-slots:** Legg til ekstra entries i [vercel.json](vercel.json), f.eks. `"0 12 * * 1-5"` og `"0 15 * * 1-5"` for 3 slots × 1 post = 3/dag spredt utover.
- **Justere scoring-vekter:** Se [src/lib/jobs/linkedin-selector.ts](src/lib/jobs/linkedin-selector.ts), endre multiplikatorer (`* 3`, `* 2`, `* 1`).
- **Whitelist arbeidsgivere:** Legg til i `EMPLOYER_WHITELIST` i samme fil.
- **Endre post-tekst-maler:** Se `COMMENTARY_TEMPLATES` i [src/lib/linkedin/format-post.ts](src/lib/linkedin/format-post.ts).
