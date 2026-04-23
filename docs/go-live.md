# Go-live: søknadsbasen.no

Huskeliste for å flytte Stripe-betaling fra test til prod. Arbeid deg nedover — rekkefølgen er valgt så du ikke må hoppe tilbake.

## Stripe (live-modus)

- [ ] Toggle Stripe Dashboard til **Live mode** (øverst høyre)
- [ ] Opprett produktene på nytt i live-modus (test-priser fungerer ikke) → noter nye `price_…`-ID-er
- [ ] Kopier live `pk_live_…` og `sk_live_…` fra [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
- [ ] [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
  - URL: `https://søknadsbasen.no/api/stripe/webhook` (IDNA: `xn--sknadsbasen-95a.no`)
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Kopier `whsec_…` (prod — forskjellig fra test-secret)
- [ ] Aktiver **Customer Portal** i live-modus ([dashboard.stripe.com/settings/billing/portal](https://dashboard.stripe.com/settings/billing/portal)) — egen konfig per modus. Repeter oppsettet fra Sandbox
- [ ] Bekreft **forretningsnavn, org.nr, bankkonto** under Settings → Business — kreves for å motta utbetalinger
- [ ] Sett opp **tax/MVA** hvis aktuelt (Stripe Tax eller manuelt)
- [ ] Branding (logo, farger) i live-modus
- [ ] Sett opp **kvittering-eposter** i Settings → Emails

## Vercel env (Production-environment, ikke Preview/Development)

- [ ] `STRIPE_SECRET_KEY` = `sk_live_…`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (prod)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
- [ ] `STRIPE_PRICE_MONTHLY` = ny live price-ID
- [ ] `STRIPE_PRICE_ONETIME` = ny live price-ID
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://søknadsbasen.no` (eller `https://www.søknadsbasen.no`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` satt
- [ ] `DATABASE_URL` + `DIRECT_URL` peker på prod-Supabase-prosjektet
- [ ] Redeploy etter env-endringer (env trer ikke i kraft før neste build)

## Supabase (prod-prosjekt)

- [ ] Kjør Prisma-migrasjon mot prod:
  ```
  npx prisma db execute --file prisma/migrations/20260423130000_add_subscriptions/migration.sql --schema prisma/schema.prisma
  npx prisma migrate resolve --applied 20260423130000_add_subscriptions
  ```
- [ ] Kjør RLS-SQL i prod SQL editor: [supabase/migrations/20260423130000_subscriptions_rls.sql](../supabase/migrations/20260423130000_subscriptions_rls.sql)
- [ ] Verifiser: `select * from "Subscription"` som anon-bruker returnerer 0 rader
- [ ] Bekreft at Supabase Auth **Site URL** + **Redirect URLs** inkluderer `https://søknadsbasen.no`

## Domene / DNS / Vercel

- [ ] Legg til `søknadsbasen.no` og `www.søknadsbasen.no` som domener i Vercel-prosjektet
- [ ] DNS: `A`/`CNAME` mot Vercel, verifiser SSL-sertifikat (automatisk Let's Encrypt)
- [ ] Velg primær (apex eller www) og konfigurer 308-redirect til den andre
- [ ] Test fra mobilnett: `curl -I https://søknadsbasen.no/pricing`

## App-kode / innhold

- [ ] Fjern `console.log` med sensitive data (sjekk webhook-handler)
- [ ] `next.config.ts`: fjern `X-Robots-Tag: noindex` hvis satt for dev
- [ ] `robots.txt` + `sitemap.xml` for prod
- [ ] Legg til **vilkår** (`/vilkar`) og **personvern** (`/personvern`) — lovpålagt
- [ ] Link til vilkår/personvern fra pricing-siden og legg URL-er i Stripe Customer Portal → Business information
- [ ] Sett `metadata.metadataBase` i root layout til `https://søknadsbasen.no`
- [ ] OG-image + favicon for søknadsbasen-branding

## Betalingsflyt-verifikasjon (live)

- [ ] Gjør ett ekte kjøp av hver plan (refunder etterpå via Dashboard)
- [ ] Bekreft webhook leverer `[200]` i Stripe Dashboard → Webhooks → endpoint → Events
- [ ] `Subscription`-rad opprettes med riktig `type`, `status`, `currentPeriodEnd`
- [ ] `/app/billing` viser riktig plan + "Administrer abonnement" åpner Portal
- [ ] Test kansellering via Portal → `customer.subscription.deleted` → `status='canceled'`
- [ ] Test PDF-eksport → fungerer aktivt, returnerer 402 + redirect til `/pricing` uten abonnement

## Juridisk / regnskap

- [ ] MVA-vurdering: privatkunder i Norge → 25% utgående MVA på digitale tjenester
- [ ] Registrer i Skatteetaten (vanlig MVA-registrering ved 50k+ omsetning siste 12 mnd)
- [ ] Fakturaløsning / regnskapsføring (Fiken, Tripletex) kobles til Stripe-eksport
- [ ] Angrerett: digitale tjenester kan fritas hvis bruker samtykker til umiddelbar levering — legg samtykke-checkbox før checkout
- [ ] Oppbevaring av kvitteringer: 5 år (bokføringsloven)

## Observability

- [ ] Sett opp varsling i Stripe Dashboard (failed payments, disputes)
- [ ] Sett opp varsling i Vercel (deploy fail, function errors)
- [ ] Supabase: aktiver daily backup hvis ikke aktivert
- [ ] Loggvisning for webhook-feil: sjekk Vercel Function logs første uken daglig

## Ikke-blokkerende, men viktig snart

- [ ] Email fra egen domene (Resend/Postmark) for transactional — ikke bruk Supabase default
- [ ] Rate limiting på `/api/stripe/checkout`
- [ ] Test gjenopprettelse: slett prod-DB-rad manuelt, kjør `stripe events resend <event_id>` → idempotent upsert skal reparere

## Customer Portal-konfig (både test og live — må settes per modus)

- **Invoices**: Show invoice history ✅
- **Customer information**: Email, Billing address, Tax ID, Name, Phone ✅ (Shipping ❌)
- **Payment methods**: Update ✅
- **Cancellations**:
  - Allow cancel ✅
  - Mode: **Cancel at end of billing period**
  - Reason: på (3–4 grunner)
  - Proration: Do not prorate
- **Subscriptions**: Switch plans ❌, Update quantities ❌, Pause ❌ (aktiver når flere planer finnes)
- **Business information**: ToS + Privacy URL-er, default redirect tom (koden setter per session)
- **Branding**: logo, accent `#c15a3a`, brand `#14110e`
