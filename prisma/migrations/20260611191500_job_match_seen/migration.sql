-- Fase 0.5: forhåndsberegnede match-scores (JobMatch) + sett-status (JobSeen).
-- JobMatch skrives av src/lib/jobs/match.ts (enrich-cron + cv-keywords-hook);
-- cvHash gjør staleness-sjekk til kolonne-sammenligning uten join mot UserData.

CREATE TABLE "JobMatch" (
    "userId" UUID NOT NULL,
    "jobId" TEXT NOT NULL,
    "score" SMALLINT NOT NULL,
    "cvHash" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("userId", "jobId")
);

CREATE TABLE "JobSeen" (
    "userId" UUID NOT NULL,
    "jobId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobSeen_pkey" PRIMARY KEY ("userId", "jobId")
);

ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSeen" ADD CONSTRAINT "JobSeen_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobSeen" ADD CONSTRAINT "JobSeen_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback: DROP TABLE "JobMatch"; DROP TABLE "JobSeen"; — begge er avledet
-- state (scores rekomputeres fra CV+jobb; sett-status er ikke kritisk).
