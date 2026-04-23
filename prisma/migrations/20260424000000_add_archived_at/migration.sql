-- Legger til arkiveringsfelt på JobApplication.
-- NULL betyr ikke-arkivert, en timestamp betyr arkivert på det tidspunktet.
ALTER TABLE "JobApplication" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "JobApplication_userId_archivedAt_idx" ON "JobApplication" ("userId", "archivedAt");
