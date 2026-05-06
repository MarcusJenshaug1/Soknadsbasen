# Tier S-verifisering — 6. mai 2026

**Commit:** 896cfd4 (`feat(konkurranse): Tier S quick wins for Lønna-konkurranse`)  
**Bransjegrunnlag:** Deployet 29. april 2026 · Verifisert 6. mai 2026  
**Verifisert av:** Claude Code

---

## Sammendrag (5 linjer)

S1, S2, S3 og S4 er bekreftet deployet via kildekode-verifisering. Produksjons-HTTP ikke direkte verifiserbart fra sandkasse-miljø (Vercel WAF returnerer 403 for alle kall). S5 (Match Score MVP) er delvis deployet: API-endepunktet finnes på `/api/ai/match-score` og returnerer 401 som forventet, men de spec-definerte filene `src/lib/match-score.ts` og `src/components/match-score/MatchScoreDisplay.tsx` mangler — API bruker Gemini direkte. Bing har ennå ikke indeksert `/sammenligning/lonna` eller `/personvern-og-data` — IndexNow bør trigges manuelt.

---

## Statusoversikt S1–S5

| ID | Endring | Kildekode ✓/✗ | Prod HTTP | Sitemap | Merknad |
|----|---------|--------------|-----------|---------|---------|
| S1 | Norsk-modus AI-prompt (`FORBIDDEN_PHRASES`, `validateCoverLetter`, `warnings` i SSE) | ✓ | Ikke verifiserbart (403 WAF) | — | `cover-letter-prompt.ts` + `route.ts` fullstendig ✓ |
| S2 | `/sammenligning/lonna` + 301 fra `/sammenligning/jobbe-ai` | ✓ | Ikke verifiserbart (403 WAF) | ✓ dynamisk via COMPETITORS | `competitors.ts` slug `lonna` ✓, `next.config.ts` redirect ✓ |
| S3 | `AtsCertifiedBadge` i CV-bygger + `/funksjoner` | ✓ | Ikke verifiserbart (403 WAF) | — | Tekst "Alle Søknadsbasens CV-maler passerer ATS-test" i komponent ✓; `variant="full"` på `/funksjoner` ✓ |
| S4 | `/personvern-og-data` med arkitekturdiagram | ✓ | Ikke verifiserbart (403 WAF) | ✓ priority 0.6 | Supabase + Stockholm ✓, Aldri/Alltid-lister ✓ |
| S5 | Match Score MVP (`computeMatchScore`, `MatchScoreDisplay`, `/api/match-score`) | ⚠ Delvis | Ikke verifiserbart (403 WAF) | — | Se detaljer nedenfor |

---

## S5 — Avvik fra spec

Spec-definerte filer som **mangler**:
- `src/lib/match-score.ts` (med `computeMatchScore()`)
- `src/components/match-score/MatchScoreDisplay.tsx`

Hva som faktisk er deployet:
- `/api/ai/match-score/route.ts` — bruker Gemini direkte (ikke `computeMatchScore()`)
- Endepunktsti avviker: spec sa `/api/match-score`, faktisk implementert som `/api/ai/match-score`
- Returnerer 401 for uauthentiserte kall ✓
- UI-integrasjon i søknadsside er ikke gjort (bekreftet i spec)

---

## Bing-indeksering per ny side

| Side | Indeksert (Bing) | Merknad |
|------|-----------------|---------|
| `/sammenligning/lonna` | ✗ Ikke indeksert | 0 resultater på `site:søknadsbasen.no/sammenligning/lonna` |
| `/personvern-og-data` | ✗ Ikke indeksert | 0 resultater på `site:søknadsbasen.no/personvern-og-data` |

**Rangering:**
- "søknadsbasen vs lønna": Søknadsbasen.no **ikke i topp 10** — konkurrenten Lønna.no er #1
- "AI søknadsbrev Norge 2026": Søknadsbasen.no **ikke i topp 10** — Jobbe.ai (#1), Lønna.no (#5), cvcv.no (#8)

> Merknad: Bing-søk kjørt fra US-basert søkemotor. Norsk lokalisering kan gi noe avvikende resultater.

---

## Anbefalinger til neste økt

1. **IndexNow — trigger manuelt** for `/sammenligning/lonna` og `/personvern-og-data`.  
   Endepunkt: `POST /api/cron/indexnow` (finnes i kodebasen). Kjøres med cron-nøkkel eller manuelt i Vercel dashboard.

2. **S5 komplettering** — implementer `src/lib/match-score.ts` med `computeMatchScore()` og `src/components/match-score/MatchScoreDisplay.tsx` som spec beskriver, og bytt API-sti fra `/api/ai/match-score` til `/api/match-score` (eller oppdater spec om arkitekturendringen er bevisst).

3. **Produksjons-HTTP-verifisering** — gjøres fra en maskin/IP som ikke er blokkert av Vercel WAF. Kjør curl-kommandoene i oppgave-beskrivelsen fra lokal utviklingsmaskin.

4. **Rangerings-oppfølging** — vurder interlink fra eksisterende høy-DA-sider (f.eks. `/guide/ats-cv`) til `/sammenligning/lonna` for å akselerere indeksering.

5. **CV-malnavn i sammenligning-siden** — Aurora, Bergen, Oslo, Brilliance, Skyline, Horizon ble ikke funnet i `sammenligning/[konkurrent]/page.tsx`. Bekreft at disse faktisk er synlige for brukere og søkemotorer på Lønna-sammenligning-siden.

---

## Tekniske detaljer

- **Kildekode-commit:** `896cfd4` bekreftet i `git log` (posisjon 53 bak HEAD per 6. mai)
- **Produksjons-HTTP:** Vercel WAF blokkerer alle requests fra sandbox (403 `x-deny-reason: host_not_allowed`) — dette er ikke en deploy-feil
- **Sitemap:** `src/app/sitemap.ts` genererer `/sammenligning/lonna` dynamisk fra `COMPETITORS`-listen (priority 0.6) og inkluderer `/personvern-og-data` (priority 0.6) eksplisitt
- **301-redirect:** `next.config.ts` linje 49–50: `source: "/sammenligning/jobbe-ai"` → `destination: "/sammenligning/lonna"`
