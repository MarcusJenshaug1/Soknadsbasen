-- Lignende stillinger rangerer nå på occupation (NAV-yrke) som hovedsignal;
-- OR-spørringen (occupation, category) trenger indeks for BitmapOr.

CREATE INDEX "Job_isActive_occupation_idx" ON "Job"("isActive", "occupation");

-- Rollback: DROP INDEX "Job_isActive_occupation_idx";
