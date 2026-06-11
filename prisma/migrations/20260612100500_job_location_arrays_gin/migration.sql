-- GIN-indekser for &&-filtrering på lokasjons-arrays (egen migrasjon, jf.
-- indeks-regelen). Ved ~13k aktive rader er dette mest fremtidssikring.

CREATE INDEX "Job_regioner_idx" ON "Job" USING GIN ("regioner");
CREATE INDEX "Job_kommuner_idx" ON "Job" USING GIN ("kommuner");

-- Rollback: DROP INDEX "Job_regioner_idx"; DROP INDEX "Job_kommuner_idx";
