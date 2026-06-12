-- On-demand matching: hoved-CV-peker + tilstand for siste eksplisitte
-- match-kjøring (Match meg-knappen på /jobb).

ALTER TABLE "UserData"
  ADD COLUMN "mainResumeId"  TEXT,
  ADD COLUMN "matchedCvHash" TEXT,
  ADD COLUMN "matchedAt"     TIMESTAMP(3);

-- Backfill (deterministisk kolonnemigrering, ikke seed): under gammel flyt
-- kjørte computeMatchesForUser alltid rett etter at aiKeywordsHash ble
-- stemplet, så hashen ER «CV-en ved siste matching». Uten backfill ville
-- alle eksisterende matchede brukere fått en ny gratisrunde.
UPDATE "UserData"
SET "matchedCvHash" = "aiKeywordsHash",
    "matchedAt"     = "aiKeywordsAt"
WHERE "aiKeywordsHash" IS NOT NULL;

-- Rollback:
--   ALTER TABLE "UserData" DROP COLUMN "mainResumeId",
--     DROP COLUMN "matchedCvHash", DROP COLUMN "matchedAt";
