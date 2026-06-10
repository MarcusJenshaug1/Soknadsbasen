# Deploy Søknadsbasen på Coolify (Hetzner, EU)

Migrering fra Vercel til selvhostet Coolify. Repoet er gjort klart med
`Dockerfile`, `output: "standalone"`, system-Chromium for PDF, og migrasjoner
ved oppstart. Stegene under utfører du selv (krever server-, DNS- og
secret-tilgang).

> **Behold Vercel kjørende til Coolify er verifisert.** Gjør DNS-cutover (steg 9)
> helt til slutt, så har du rollback hele veien.

---

## 1. Provisjoner Hetzner-server (EU)

- **Type:** minst **CPX31** (4 vCPU / 8 GB RAM) — Puppeteer/Chromium til
  PDF-generering trenger RAM. CPX41 hvis mye samtidig PDF.
- **Region:** Falkenstein (`fsn1`), Nürnberg (`nbg1`) eller Helsinki (`hel1`) — alle EU.
- **OS:** Ubuntu 24.04.
- **Firewall:** åpne 22 (SSH), 80, 443.
- Legg til SSH-nøkkelen din ved opprettelse.

> 🔐 Roter Hetzner API-tokenet du delte i chatten når serveren er oppe.

## 2. Installer Coolify

SSH inn som root og kjør:

```sh
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Åpne `http://<server-ip>:8000`, opprett admin-bruker. (Sett gjerne et eget
subdomene som `coolify.dindomene.no` for dashbordet.)

## 3. DNS

Pek domenene mot serverens IP (senk TTL til 300s et døgn før cutover):

| Record | Navn | Verdi |
|---|---|---|
| A | `soknadsbasen.no` (eller subdomene for test først) | `<server-ip>` |
| A | `coolify.dindomene.no` | `<server-ip>` |

**Test gjerne på et midlertidig subdomene** (`coolify-test.soknadsbasen.no`) før
du flytter hoveddomenet.

## 4. Opprett applikasjonen i Coolify

1. **+ New Resource → Public/Private Repository** → koble til GitHub-repoet.
2. **Branch:** `main`.
3. **Build Pack:** **Dockerfile** (Coolify finner `Dockerfile` i rot).
4. **Port:** `3000`.
5. **Health check path:** `/` (eller en lett rute).

## 5. Miljøvariabler

Coolify skiller på **build-time** (må være satt når imaget bygges) og
**runtime**. `NEXT_PUBLIC_*` inlines i bundelen ved build → marker dem som
tilgjengelige under build (Coolify: huk av «Build Variable» / «Available at
buildtime»).

### Build-time (også runtime) — `NEXT_PUBLIC_*`
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL            # https://soknadsbasen.no
NEXT_PUBLIC_VAPID_PUBLIC_KEY
NEXT_PUBLIC_HOCUSPOCUS_URL      # kun hvis collab-realtime brukes (se steg 10)
```

### Runtime (hemmeligheter)
```
DATABASE_URL                    # Supabase pooled (pgbouncer=true&connection_limit=1)
DIRECT_URL                      # Supabase non-pooled (brukes av migrate deploy)
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY               # leses implisitt av Anthropic SDK
ANTHROPIC_MODEL                 # valgfri global modell-override
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET           # ny verdi fra nytt webhook-endpoint (steg 10)
STRIPE_PRICE_MONTHLY
STRIPE_PRICE_ONETIME
STRIPE_PRICE_ORG_SEAT
STRIPE_PRODUCT_INDIVIDUAL
STRIPE_PRODUCT_ORG
RESEND_API_KEY
RESEND_WEBHOOK_SECRET
CRON_SECRET                     # generer: openssl rand -hex 32
ADMIN_EMAIL
COLLAB_JWT_SECRET
VAPID_PRIVATE_KEY
GOOGLE_SITE_VERIFICATION        # valgfri
BING_SITE_VERIFICATION          # valgfri
```

> ⚠️ **Sett IKKE `VERCEL`.** Den variabelen tvinger PDF-koden over på den
> serverless-spesifikke `@sparticuz/chromium`-banen. På Coolify skal den være
> fraværende, så system-Chromium brukes.
> 💡 `GEMINI_API_KEY` skal ikke settes (ikke i bruk lenger).

## 6. Hent secrets fra Vercel

På din egen maskin (ikke i denne sandkassen):

```sh
npm i -g vercel
vercel login
vercel link            # i prosjektmappa
vercel env pull .env.vercel --environment=production
```

`.env.vercel` inneholder nå alle prod-verdiene — kopier dem inn i Coolify.
**Slett fila etterpå** (`rm .env.vercel`). Alternativt: kopier manuelt fra
Vercel-dashbordet (Settings → Environment Variables).

## 7. Domene + TLS

I Coolify: sett app-domenet (`https://soknadsbasen.no`). Coolify utsteder
Let's Encrypt-sertifikat automatisk når DNS peker riktig. Deploy.

## 8. Cron / planlagte oppgaver

`vercel.json`-cronene virker ikke på Coolify. Opprett **Scheduled Tasks** i
Coolify (eller systemd/cron på serveren) som kaller appens egne endepunkt med
`CRON_SECRET`:

| Endepunkt | Schedule | Hva |
|---|---|---|
| `/api/cron/jobs-sync` | `0 4 * * *` | Synk NAV-stillinger |
| `/api/cron/release-commissions` | `0 5 * * *` | Frigjør provisjoner |
| `/api/cron/reminders` | `0 8 * * *` | Påminnelser (intervju/frist) |
| `/api/cron/indexnow` | `0 6 * * *` | IndexNow (valgfri) |

Kommando per task:
```sh
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://soknadsbasen.no/api/cron/jobs-sync
```

> Rutene feiler nå **lukket** uten `CRON_SECRET` — sørg for at den er satt.

## 9. Repoint webhooks og auth (FØR cutover)

- **Stripe:** lag nytt webhook-endpoint → `https://soknadsbasen.no/api/stripe/webhook`,
  abonner på samme events som før, kopier ny signing secret til
  `STRIPE_WEBHOOK_SECRET`.
- **Resend (inbound):** pek webhook til `https://soknadsbasen.no/api/resend/inbound`,
  oppdater `RESEND_WEBHOOK_SECRET`.
- **Supabase Auth:** legg til ny URL under Auth → URL Configuration (Site URL +
  Redirect URLs) slik at innlogging/passord-reset peker på nytt domene.
- **IndexNow:** nøkkelfila `/soknadsbasen-indexnow-2026.txt` følger med appen — ok.

## 10. Collab-realtime (hvis i bruk)

`NEXT_PUBLIC_HOCUSPOCUS_URL` + mappa `hocuspocus-server/` er en egen
WebSocket-tjeneste (sanntids-samskriving). Hvis dere bruker collab:
deploy den som en **egen** Coolify-resource (egen Dockerfile/port) og pek
`NEXT_PUBLIC_HOCUSPOCUS_URL` dit. Bruker dere det ikke, kan variabelen stå tom.

## 11. Deploy og verifiser

Trigger deploy i Coolify. Sjekk byggeloggen for «Compiled successfully» og at
`prisma migrate deploy` kjørte ved oppstart. Test så:

- [ ] Forsiden + `/jobb` laster, TLS grønt
- [ ] Innlogging (Supabase auth mot nytt domene)
- [ ] **AI:** generer søknadsbrev + forbedre profil (Claude)
- [ ] **PDF:** last ned CV som PDF (Puppeteer/Chromium i container)
- [ ] Stripe test-betaling → webhook treffer (sjekk logg)
- [ ] En cron-task manuelt → 200, ikke 401

## 12. Cutover

Når alt er grønt: flytt A-recorden for `soknadsbasen.no` til serverens IP.
Behold Vercel som rollback til du har sett trafikk + webhooks virke et døgn.
Deretter kan Vercel-prosjektet pauses/slettes og `vercel.json` fjernes fra repoet.

---

## Repo-endringer som er gjort for dette
- `Dockerfile`, `.dockerignore`, `docker-entrypoint.sh` (migrate deploy → start)
- `next.config.ts`: `output: "standalone"`
- `src/lib/pdfRender.ts`: bruker `PUPPETEER_EXECUTABLE_PATH` (system-Chromium)
- `vercel.json` beholdes midlertidig for rollback; fjernes etter cutover

## Kjente forbehold
- Dockerfile er ikke testbygget i revisjons-miljøet (ingen Docker-egress der) —
  kjør første `docker build` på serveren og sjekk loggen.
- PDF er minnetungt; hold deg på ≥ 8 GB RAM, vurder swap.
- Supabase (DB/auth/storage) forblir i EU som før — kun appserveren flyttes.
