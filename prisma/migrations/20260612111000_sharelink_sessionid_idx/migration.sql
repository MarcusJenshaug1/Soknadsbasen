-- Egen migrasjon for indeksen (jf. indeks-regelen): FK-cascade fra
-- JobSearchSession-sletting slår opp på sessionId.

CREATE INDEX "ShareLink_sessionId_idx" ON "ShareLink"("sessionId");

-- Rollback: DROP INDEX "ShareLink_sessionId_idx";
