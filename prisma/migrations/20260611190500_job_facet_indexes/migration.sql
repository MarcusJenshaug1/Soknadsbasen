-- Indeks for «Søknadsfrist»-sortering i /jobb (egen migrasjon, jf. regel om
-- at indekser ikke buntes med skjemaendringer).

CREATE INDEX "Job_isActive_applicationDueAt_idx" ON "Job"("isActive", "applicationDueAt");

-- Rollback: DROP INDEX "Job_isActive_applicationDueAt_idx";
