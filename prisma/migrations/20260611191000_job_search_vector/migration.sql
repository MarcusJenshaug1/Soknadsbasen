-- Fulltekst-søk for /jobb: generated tsvector-kolonne + GIN-indeks.
-- Raw SQL er nødvendig — Prisma kan ikke uttrykke GENERATED ALWAYS AS.
-- norwegian-config gir snowball-stemming for vanlige bøyninger («jobben» →
-- «jobb»), men agentum-suffikser dekkes ikke fullt («sykepleiere» matcher
-- IKKE «sykepleier» — verifisert på PG17). Godt nok for fritekst + relevans;
-- typo-/suffikstoleranse kan ev. legges på senere med pg_trgm på title.
-- Vekting A>B>C>D gir tittel-treff > arbeidsgiver > kategori > brødtekst
-- ved ts_rank for relevans-sortering. HTML strippes fra description.
-- Ved ~10k rader tar rewrite + indeksbygg sekunder; CONCURRENTLY unødvendig.

ALTER TABLE "Job" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('norwegian', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('norwegian', coalesce("employerName", '')), 'B') ||
    setweight(to_tsvector('norwegian',
      coalesce("category", '') || ' ' || coalesce("occupation", '') || ' ' || coalesce("jobTitle", '')), 'C') ||
    setweight(to_tsvector('norwegian',
      regexp_replace(coalesce("description", ''), '<[^>]+>', ' ', 'g')), 'D')
  ) STORED;

CREATE INDEX "Job_searchVector_idx" ON "Job" USING GIN ("searchVector");

-- Rollback: DROP INDEX "Job_searchVector_idx"; ALTER TABLE "Job" DROP COLUMN "searchVector";
-- Kolonnen er generert — ingen data går tapt ved drop.
