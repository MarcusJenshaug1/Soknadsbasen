CREATE TABLE "InterviewStage" (
  "id"            TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "round"         INTEGER NOT NULL,
  "type"          TEXT NOT NULL DEFAULT 'other',
  "scheduledAt"   TIMESTAMP(3),
  "outcome"       TEXT NOT NULL DEFAULT 'pending',
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InterviewStage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InterviewStage" ADD CONSTRAINT "InterviewStage_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "InterviewStage_applicationId_idx" ON "InterviewStage"("applicationId");
