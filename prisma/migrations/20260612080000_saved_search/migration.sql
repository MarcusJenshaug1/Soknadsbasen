-- Fase 3: lagrede søk med varsler. SavedSearch = navngitt filterkombinasjon
-- (kanonisk querystring) + kanal-toggles; SavedSearchHit deduper varsler til
-- maks ett per (stilling, søk). emailedAt null = venter på daglig digest.

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailFrequency" TEXT NOT NULL DEFAULT 'daglig',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedSearchHit" (
    "savedSearchId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailedAt" TIMESTAMP(3),
    CONSTRAINT "SavedSearchHit_pkey" PRIMARY KEY ("savedSearchId", "jobId")
);

ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedSearchHit" ADD CONSTRAINT "SavedSearchHit_savedSearchId_fkey"
  FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedSearchHit" ADD CONSTRAINT "SavedSearchHit_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback: DROP TABLE "SavedSearchHit"; DROP TABLE "SavedSearch"; — brukerdata
-- (navngitte søk) går tapt ved rollback; varsel-dedup regenereres ikke.
