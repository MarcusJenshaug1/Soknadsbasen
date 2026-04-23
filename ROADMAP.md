# Jobbsøkerportal — Gap-analyse & Roadmap

> **Nåværende tilstand:** Sterk CV-bygger og søknadsbrev-editor med statusflyt, sky-synk og PDF-eksport.
> **Mål:** En komplett jobbsøkerportal der CV, søknader, dokumenter og oppfølging lever sammen.

---

## Gap-oversikt

| # | Gap | Alvorlighet | Fase |
|---|-----|-------------|------|
| 1 | Mangler domenemodell (JobApplication, Company, Task, …) | 🔴 Blokkerer | 1 |
| 7 | JSON-blob-synk — svak for queries og rapportering | 🔴 Blokkerer | 1 |
| 8 | MVP-kode i API-laget (hardkodet guest, lokal Prisma-instans) | 🔴 Blokkerer | 1 |
| 2 | Jobbsporing utover brev (kilde, lønn, kontakt, vedlegg, status) | 🟠 Kjerne | 2 |
| 5 | Dokumentkobling per søknad (CV-versjon, brev, vedlegg) | 🟠 Kjerne | 2 |
| 6 | Søk, filter, sortering og pipeline-visning på tvers | 🟠 Kjerne | 2 |
| 3 | Jobbinnhenting — manuell URL-import og annonseparsing | 🟡 Utvidelse | 2 |
| 4 | Oppgaver, varsler, påminnelser og kalenderintegrasjon | 🟡 Utvidelse | 3 |
| 9 | Deling — offentlig CV-lenke, portfolio, rådgiver-tilgang | 🟡 Utvidelse | 3 |
| 10 | Drift — tester, rate limiting, observability, admin, betaling | 🟢 Kvalitet | 3 |

---

## Fase 1 — Solid fundament
**Mål:** Bygg grunnlaget alt annet avhenger av. Ingenting fra fase 2–3 er mulig uten dette.
**Estimat:** 3–4 uker

### 1.1 — Ny domenemodell i Prisma

Legg til følgende modeller i `prisma/schema.prisma`:

```prisma
model Company {
  id           String   @id @default(uuid())
  userId       String
  name         String
  website      String?
  industry     String?
  size         String?
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  applications JobApplication[]

  @@index([userId])
}

model JobApplication {
  id               String    @id @default(uuid())
  userId           String
  companyId        String?
  title            String               // Stillingstittel
  source           String?              // finn.no, linkedin, direkte, osv.
  jobUrl           String?
  salary           String?
  applicationDate  DateTime?
  deadlineAt       DateTime?
  status           String    @default("draft") // draft|applied|interview|offer|accepted|rejected|withdrawn
  statusNote       String?
  statusUpdatedAt  DateTime?
  contactName      String?
  contactEmail     String?
  contactPhone     String?
  jobDescription   String?   // Kopi av annonsetekst
  notes            String?
  coverLetterId    String?              // Referanse til Zustand-brev (UUID)
  resumeSnapshotId String?              // FK → ResumeVersion
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  company          Company?  @relation(fields: [companyId], references: [id])
  resumeSnapshot   ResumeVersion? @relation(fields: [resumeSnapshotId], references: [id])
  tasks            Task[]
  attachments      Attachment[]
  activityLog      ApplicationActivity[]

  @@index([userId])
  @@index([userId, status])
}

model Task {
  id              String   @id @default(uuid())
  applicationId   String
  title           String
  dueAt           DateTime?
  completedAt     DateTime?
  type            String?   // followup|interview|deadline|other
  createdAt       DateTime  @default(now())
  application     JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
}

model Attachment {
  id              String   @id @default(uuid())
  applicationId   String
  filename        String
  mimeType        String
  sizeBytes       Int
  storageKey      String   // S3-key eller lokal path
  createdAt       DateTime @default(now())
  application     JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)
}

model ApplicationActivity {
  id              String   @id @default(uuid())
  applicationId   String
  type            String   // note|status_change|email|call|interview|offer
  note            String?
  occurredAt      DateTime @default(now())
  application     JobApplication @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
}
```

**Migrasjon:** `npx prisma migrate dev --name add-job-application-domain`

### 1.2 — Fjern JSON-blob-synk for søknader

- Behold JSON-bloben for CV og søknadsbrev-design (de er dokument-lignende og passer dårlig i rader)
- **Fjern** `coverLetterData` fra `UserData`-bloben og legg søknader i `JobApplication`-tabellen
- Ny API-kontrakt:
  - `GET /api/applications` → liste med filter (status, search, sort)
  - `POST /api/applications` → opprett
  - `PATCH /api/applications/[id]` → oppdater felt
  - `DELETE /api/applications/[id]`
  - `GET /api/applications/[id]` → detaljvisning med tasks + aktivitetslogg

### 1.3 — Rydd opp MVP-kode i API-laget

Filer som må fikses:
- `src/app/api/resumes/route.ts` — fjern hardkodet `"anonymous-guest-1"`, bruk `getSession()` og den delte `prisma`-instansen fra `src/lib/prisma.ts`
- Alle routes som oppretter `new PrismaClient()` lokalt — erstatt med `import { prisma } from "@/lib/prisma"`
- Legg til en delt `requireAuth()` helper i `src/lib/auth.ts` som kaster 401 i én linje, slik at alle routes er konsistente

### 1.4 — Ny Zustand-store for søknader

`src/store/useApplicationStore.ts` som:
- Henter data fra `/api/applications` (ikke fra blob)
- Har optimistisk oppdatering for status-endringer
- Erstatter `useCoverLetterStore` for selve søknadsdelen (beholde brev-editoren, men separere tracking-data)

**Leveranse av Fase 1:**
- [ ] Ny Prisma-skjema migrert
- [ ] CRUD-API for `JobApplication` med auth
- [ ] `useApplicationStore` med server-backed data
- [ ] Ingen hardkodede verdier eller lokal PrismaClient i API-laget

---

## Fase 2 — Reell portal-funksjonalitet
**Mål:** Brukeren kan spore hele jobbsøkerprosessen fra annonse til svar i ett sted.
**Forutsetter:** Fase 1 ferdig.
**Estimat:** 4–6 uker

### 2.1 — Fullstendig jobbsporing UI

Ny side: `src/app/applications/page.tsx` — **Søknadsoversikt**
- Pipeline-visning (kanban-stil, kolonner per status)
- Listevisning med sortering (frist, dato, selskap, status)
- Søk på tittel, selskap, notat
- Filterpanel (status, kilde, dato-intervall)

Ny side: `src/app/applications/[id]/page.tsx` — **Søknadsdetaljside**
- All metadata (lønn, kontakt, kilde, søknadsdato)
- Aktivitetslogg (tidslinje over hendelser)
- Oppgaveliste med frister
- Dokumentseksjon (se §2.2)

### 2.2 — Dokumentkobling per søknad

På detaljsiden:
- "Knytt CV-versjon" — velg blant lagrede `ResumeVersion`-snapshots (via `/api/resume-versions`)
- "Knytt søknadsbrev" — kobling til eksisterende brev i `useCoverLetterStore` via `coverLetterId`
- Last opp vedlegg (PDF, portfolio, anbefalingsbrev) → lagres som `Attachment`
- "Vis hva som ble sendt" — viser snapshot av CV + brev på sendetidspunktet (read-only)

### 2.3 — Manuell jobbimport og annonseparsing

Ny side/modal: **Legg til stilling**
1. **Manuell innlegging** — enkelt skjema (tittel, selskap, URL, frist, lønn)
2. **URL-import** — bruker eksisterer Puppeteer-instans (`puppeteer` er allerede avhengighet).
   - `POST /api/jobs/parse` tar en URL
   - Server henter siden, ekstraherer tittel/selskap/beskrivelse/frist med regex + heuristics
   - Returnerer forslag til felt som brukeren bekrefter
3. **Lim inn tekst** — bruk `cv-parser.ts`-mønsteret for annonseparsing

Støttede kilder (parsing-prioritet): Finn.no, LinkedIn, Webcruiter, offentlig sektor (Jobbnorge), generisk fallback.

### 2.4 — Selskapsoversikt

`src/app/companies/page.tsx`:
- Liste over selskaper brukeren har søkt på
- Per selskap: antall søknader, historikk og notater
- Kobling mellom `Company` og `JobApplication`

**Leveranse av Fase 2:**
- [ ] Søknadsoversikt med pipeline & listevisning
- [ ] Søknadsdetaljside med dokumentkobling
- [ ] URL-import og manuell innlegging
- [ ] Selskapsoversikt
- [ ] Søk og filtrering på tvers av søknader

---

## Fase 3 — Vekst, automatisering og kvalitet
**Mål:** Gjøre portalen klar for reell bruk av mange brukere: varsler, deling, observabilitet og kvalitetssikring.
**Forutsetter:** Fase 2 ferdig.
**Estimat:** 4–6 uker

### 3.1 — Oppgaver, varsler og påminnelser

- **E-postvarsler** via eksisterende `nodemailer`-oppsett (`src/lib/email.ts`):
  - Påminnelse dagen før søknadsfrist
  - Påminnelse om oppfølging ("du hørte ikke noe på 2 uker")
  - Intervjupåminnelse
- **Scheduler**: Cron-basert — enten via `Vercel Cron Jobs` (`vercel.json`) eller en dedikert `src/app/api/cron/reminders/route.ts` kalt fra ekstern scheduler
- **Kalendereksport**: `GET /api/applications/[id]/ics` genererer en `.ics`-fil som kan importeres i Google Calendar / Outlook

### 3.2 — Deling og offentlig profil

- `src/app/[username]/page.tsx` — Offentlig, read-only CV-side (valgfri, opt-in)
- `src/app/cv/[shareToken]/page.tsx` — Del CV via enganglenke med token (allerede har `pdfTokenStore.ts` som inspirasjon)
- `GET /api/applications/[id]/export` — Eksport av enkelt søknad som PDF-oppsummering
- Rådgiverrolle: `User`-modellen utvides med `role: "user" | "advisor"`, advisor kan se delte CVer

### 3.3 — Drift og kvalitet

**Tester:**
- `jest` + `@testing-library/react` for komponent-tester
- `jest` + Prisma `mockDeep` for API-handler-tester
- Prioritér tester for: `auth.ts`, alle API-routes, `useApplicationStore`, `LanguagesForm`

**Rate limiting:**
- Middleware-basert i `proxy.ts`/`middleware.ts` — legg til simpel in-memory eller Upstash Redis rate limiter på auth-routes og `/api/jobs/parse`

**Observabilitet:**
- Legg til `console.error` → strukturert logging (f.eks. `pino` eller Vercel runtime logging)
- `POST /api/audit` for bruker-handlinger (innlogging, sletting, eksport) — lagres i en `AuditLog`-tabell

**Admin:**
- `src/app/admin/page.tsx` (kun `role: "admin"`-brukere)
- Brukerliste, statistikk, manuell datarydding

**Betalingsmodell (valgfritt):**
- Gratis-tier: 1 aktiv CV, 5 søknader
- Pro: ubegrenset CV, ubegrenset søknader, URL-import, deling, PDF-server
- `stripe`-pakke + webhook-handler i `src/app/api/stripe/webhook/route.ts`
- `subscription`-felt på `User`-modellen

**Leveranse av Fase 3:**
- [ ] E-postvarsler og cron-scheduler
- [ ] Offentlig CV-delingslenke
- [ ] Test-suite med > 60% dekning på kritiske paths
- [ ] Rate limiting på auth og parsing-endpoints
- [ ] Adminflate og strukturert logging
- [ ] (Valgfritt) Stripe-integrasjon

---

## Teknisk gjeld som tas løpende (ikke fasespesifikk)

| Problem | Fil | Handling |
|---------|-----|----------|
| Hardkodet `anonymous-guest-1` | `api/resumes/route.ts` | Fjernes i Fase 1.3 |
| Lokal `new PrismaClient()` | `api/resumes/route.ts` | Erstattes med `import { prisma }` i Fase 1.3 |
| `Math.random()` som UUID | `useResumeStore.ts`, `useCoverLetterStore.ts` | Bytt til `crypto.randomUUID()` |
| `// eslint-disable-next-line` i export-route | `api/user/export/route.ts` | Fikses når Prisma-typer er generert på nytt |
| Ingen `Content-Security-Policy` headers | `next.config.ts` | Legg til i Fase 3 |

---

## Prioritert rekkefølge for neste handling

1. **Start med `prisma/schema.prisma`** — uten datamodellen kan ingenting annet bygges
2. **Rydd opp `api/resumes/route.ts`** — blokkerer ikke andre, men er risiko
3. **Bygg `useApplicationStore`** — muliggjør at dashboard og oversikt kan knyttes mot ekte data
4. **Lagre søknader serverside** — deretter kan UI bygges uten teknisk gjeld
