# ADR: Web push som varslingskanal for lagrede søk — tas med i Fase 3

Dato: 2026-06-12 · Status: Besluttet · Kontekst: Stillingsmodul-ombyggingen Fase 3

## Spørsmål

Skal web push (service worker + VAPID) være varslingskanal for lagrede søk fra
dag én, eller utsettes? E-post + in-app er definert som minimum.

## Beslutning

**Web push tas med nå**, som opt-in-kanal per lagret søk (default av).

## Begrunnelse (faktisk PWA-status i repoet, ikke antakelser)

Hele push-stacken eksisterte allerede før Fase 3:

- `src/lib/push.ts`: `web-push` med VAPID-nøkler (NEXT_PUBLIC_VAPID_PUBLIC_KEY
  + VAPID_PRIVATE_KEY), ferdig `sendPush()`-API.
- `PushSubscription`-modell i Prisma med aktive abonnementer.
- `src/components/ServiceWorkerRegistration.tsx` + manifest/PWA-oppsett
  (apple-web-app-config i rootMetadata).
- `api/cron/reminders` sender allerede push i produksjon (frist/intervju-
  påminnelser) — mønsteret for subscription-oppslag og utsendelse er bevist.

Implementasjonskosten for jobbvarsler ble dermed ~30 linjer i
`matchSavedSearchesForJobs` (gjenbruk av `sendPush` + samme gruppering som
reminders-cronen). Å utsette ville spart nesten ingenting og gitt en ny
migrasjon/oppfølging senere.

## Konsekvenser

- `SavedSearch.pushEnabled` (default `false` — push er mest invasivt, brukeren
  må aktivt velge det per søk under /app/lagrede-sok).
- Push sendes umiddelbart ved match (i enrich-cronen), uavhengig av
  e-postfrekvensen; dedup deles via `SavedSearchHit`.
- Feilede push-forsøk svelges (`sendPush` returnerer bool) — utløpte
  abonnementer rydder reminders-flyten allerede opp i.

## Alternativ vurdert

Utsette push til egen fase: forkastet — infrastrukturkost ~0, og kanalvalget
ligger uansett per søk så ingen brukere påtvinges noe.
