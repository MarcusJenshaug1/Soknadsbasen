-- Fase 0.5: facett-kolonner på Job + tetthet/besøk på UserData.
-- kommune trekkes ut av workLocations-JSON (backfilles i egen migrasjon);
-- ai*-kolonnene fylles av enrich-cronen (Claude Haiku) — IKKE gjenbruk av de
-- døde feed-kolonnene remote/workLanguages, som nulles av hver feed-sync.

ALTER TABLE "Job" ADD COLUMN "kommune" TEXT;
ALTER TABLE "Job" ADD COLUMN "isSummerJob" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Job" ADD COLUMN "aiEducation" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "aiExperience" TEXT;
ALTER TABLE "Job" ADD COLUMN "aiDriversLicense" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "aiWorkLanguages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Job" ADD COLUMN "aiRemote" TEXT;
ALTER TABLE "Job" ADD COLUMN "aiFacetsAt" TIMESTAMP(3);

ALTER TABLE "UserData" ADD COLUMN "jobListDensity" TEXT;
ALTER TABLE "UserData" ADD COLUMN "lastJobVisitAt" TIMESTAMP(3);

-- Rollback: ALTER TABLE "Job" DROP COLUMN for hver av de åtte kolonnene, og
-- ALTER TABLE "UserData" DROP COLUMN "jobListDensity", DROP COLUMN "lastJobVisitAt".
-- Alle er nullable/defaultet og additive — gammel kode ignorerer dem trygt.
