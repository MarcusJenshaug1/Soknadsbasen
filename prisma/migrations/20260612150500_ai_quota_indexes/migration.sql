-- Sekundærindekser for AI-kvote (egen migrasjon, jf. indeks-regelen):
-- (userId) driver grant-historikk i admin; (userId, createdAt) driver
-- kostnadsrapporter og pruning av eventloggen.

CREATE INDEX "AiCreditGrant_userId_idx" ON "AiCreditGrant"("userId");
CREATE INDEX "AiUsageEvent_userId_createdAt_idx" ON "AiUsageEvent"("userId", "createdAt");

-- Rollback: DROP INDEX på begge.
