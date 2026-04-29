-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "employerOrgnr" TEXT,
  ADD COLUMN "employerDescription" TEXT,
  ADD COLUMN "employerHomepage" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "country" TEXT,
  ADD COLUMN "workLocations" JSONB,
  ADD COLUMN "categoryList" JSONB,
  ADD COLUMN "occupationList" JSONB,
  ADD COLUMN "engagementType" TEXT,
  ADD COLUMN "extent" TEXT,
  ADD COLUMN "positionCount" INTEGER,
  ADD COLUMN "sector" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "applicationDueAt" TIMESTAMP(3),
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3);
