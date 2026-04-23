# Søknadsbasen

Norsk jobbsøker-plattform — CV-bygger, søknadssporing, søknadsbrev og innsikt i ett rolig arbeidsrom.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** — nordisk minimalisme (`#faf8f5` / `#14110e` / terrakotta `#c15a3a`)
- **Geist** + Geist Mono
- **Supabase** — Postgres + Auth + Storage
- **Prisma** ORM
- **Lexical** rich-text editor
- **dnd-kit** kanban drag-and-drop
- **Puppeteer** PDF-eksport

## Kom i gang

```bash
cp .env.example .env.local
# fyll inn verdier fra Supabase-dashboardet
npm install
npx prisma generate
npm run dev
```

## Migreringer

Prisma-migrasjoner ligger under `prisma/migrations/`. Kjør dem i Supabase SQL Editor, eller:

```bash
npx prisma migrate deploy
```

## Ruter

### Offentlige
- `/` forside
- `/logg-inn`, `/registrer` auth m/toggle
- `/glemt-passord`, `/nytt-passord`
- `/velkommen` onboarding (4 trinn)

### Innlogget (`/app/*`)
- `/app` dashboard
- `/app/cv` CV-bygger
- `/app/pipeline` kanban + `/app/pipeline/[id]` detalj
- `/app/brev` + `/app/brev/[id]` søknadsbrev-editor
- `/app/oppgaver` oppgaver og frister
- `/app/selskaper` samlet per selskap
- `/app/innsikt` analyser
- `/app/profil` kontoinnstillinger
