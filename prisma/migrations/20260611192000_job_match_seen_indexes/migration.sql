-- Sekundærindekser for JobMatch/JobSeen (egen migrasjon, jf. indeks-regelen).
-- (userId, score DESC) driver match-sortering (topp-N per bruker);
-- (jobId) driver opprydding ved jobb-deaktivering + FK-delete-planene.

CREATE INDEX "JobMatch_userId_score_idx" ON "JobMatch"("userId", "score" DESC);
CREATE INDEX "JobMatch_jobId_idx" ON "JobMatch"("jobId");
CREATE INDEX "JobSeen_jobId_idx" ON "JobSeen"("jobId");

-- Rollback: DROP INDEX på de tre indeksene.
