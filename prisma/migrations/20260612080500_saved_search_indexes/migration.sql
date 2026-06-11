-- Sekundærindekser for lagrede søk (egen migrasjon, jf. indeks-regelen).
-- (userId) driver administrasjonssiden; (jobId) FK-delete ved jobbsletting.

CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");
CREATE INDEX "SavedSearchHit_jobId_idx" ON "SavedSearchHit"("jobId");

-- Rollback: DROP INDEX på begge.
