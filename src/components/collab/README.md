# Collab — anonyme invitasjoner + forslags-modus

Status etter denne PRen: Fase 1.1–1.3 av planen i
`~/.claude/plans/n-har-vi-fors-kt-virtual-bachman.md` er ferdig. Resten
gjøres etter Hocuspocus er live på Hetzner.

## Hva som funker nå (uten Hocuspocus)

- Eier oppretter invitasjon fra "Inviter hjelper"-knappen i CV-, brev-
  eller søknads-editoren
- Anonym åpner `/collab/<kind>/<token>`, server-validerer token, viser
  navn-modal, og lager en `CollabSession` etter join (anon-JWT utstedes)
- Anonym kan POST-e til `/api/collab/suggest` (testbart med Postman med
  Bearer-token fra `/api/collab/join`)
- Eier ser pending forslag inline ved feltet via `OwnerCollabBridge`
  (5-sek REST-poll), godtar/avviser via `InlineSuggestionBadge`
- Eier ser totalt-pending-counter på bell-ikon i sidebaren
- Eier kan revoke invitasjoner + se aktive sesjoner via REST

## Hva som mangler (Hocuspocus-avhengig — gjøres etter Hetzner)

1. **`hocuspocus-server/src/server.ts`** må utvides:
   - `onAuthenticate`: aksepter både Supabase-JWT (eier) og
     COLLAB_JWT_SECRET-signert JWT (anon). Type-narrow på `role`.
   - `beforeHandleMessage`: reject Y.Doc-mutasjoner for
     `role: "suggester"` UTENOM i `ydoc.getMap("suggestions")`.
   - `onConnect`/`onDisconnect`: oppdater `CollabSession.connectedAt`/
     `endedAt` via Prisma. Trigger på awareness-state-change for
     `lastSeenAt`.

2. **`src/lib/yjs/mapper.ts`**: legg til `ydoc.getMap("suggestions")`
   som Y.Map<string, Y.Map<{fieldPath, before, after, authorName,
   status}>>. Bruker eksisterende mapper-mønster.

3. **`POST /api/collab/suggest`** server-side: i tillegg til Postgres-
   raden, skriv forslaget til Y.Doc's suggestions-map via Hocuspocus
   `directConnection()`. Da får eieren det live uten å vente på 5-sek-pollet.

4. **`POST /api/collab/suggest/[id]/resolve`**: ved accept, apply
   fieldPath→afterValue til canonical Y.Doc-strukturen (active-map for
   CV, letter-map for brev, application-map for søknad). Bruker også
   Hocuspocus directConnection. Fjerner suggestion fra suggestions-map.

5. **Anon-editor-varianter**: bygges som nye komponenter eller modes
   i eksisterende editorer:
   - `AnonResumeEditor` (eller `<ResumeEditor mode="suggester" />`):
     ReadOnlyField i stedet for input, klikk åpner SuggestPopup, bruker
     useYjsSync med `role: "suggester"` + invite-JWT.
   - Tilsvarende for brev og søknad.

6. **`useYjsSync` utvidelse**: nytt argument `auth: {kind: "owner"} |
   {kind: "anon", jwt: string, displayName: string}`. Suggester-grenen
   bytter ut Supabase-JWT med invite-JWT. Awareness `user`-state
   inkluderer `isAnonymous: true` så eier kan rendre stiplet ring i
   `CollaboratorBar`.

7. **CollabToastHost**: lytter på awareness-events (join/leave fra
   useYjsSync) og rendrer 3-sek toast.

## Env-variabler

Må settes i Vercel før denne featuren brukes i prod:

```
COLLAB_JWT_SECRET=<random 32+ tegn>
```

Server-siden (Hocuspocus på Hetzner) trenger samme secret for å verifisere
anon-JWTer. Sett samme i `hocuspocus-server/.env`.

## Database

Migrasjonen `20260512100000_add_collab_invite` oppretter:
- `CollabInvite` — token + ownerId + resourceKind + resourceId + TTL
- `CollabSuggestion` — fieldPath + before/after + status
- `CollabSession` — aktiv anon-sesjon, brukes for kick + audit

Kjøres automatisk av Vercel-build (`prisma migrate deploy`).

## API-oversikt

| Endpoint | Auth | Beskrivelse |
|---|---|---|
| `POST /api/collab/invite` | Supabase | Eier oppretter token |
| `GET /api/collab/invite` | Supabase | List eier sine aktive invitasjoner |
| `DELETE /api/collab/invite/[id]` | Supabase | Revoke + end alle sesjoner |
| `GET /api/collab/invite/[id]/sessions` | Supabase | List for kick-UI |
| `GET /api/collab/preview/[token]` | Public | Pre-join-info (eier-navn etc.) |
| `POST /api/collab/join` | Public + token | Token → anon-JWT, opprett CollabSession |
| `POST /api/collab/suggest` | Bearer anon-JWT | Opprett forslag |
| `GET /api/collab/suggest?resourceKind=&resourceId=` | Supabase | Eier ser pending |
| `POST /api/collab/suggest/[id]/resolve` | Supabase | Eier accept/reject |
| `DELETE /api/collab/session/[id]` | Supabase | Eier kicker |

## Rate-limits

In-memory buckets (samme mønster som `cvShareToken`):

- `/api/collab/join`: 10 forsøk per 5 min per token
- `/api/collab/suggest`: 30 forslag per minutt per sesjon
- Max 20 aktive invitasjoner per bruker
- Max 100 pending suggestions per ressurs

In-memory bucketing er per Vercel-funksjons-instans og overlever ikke
cold start. For ekte prod-grade rate-limit må vi flytte til Upstash
Redis e.l. — men det er Fase 5-polish.
