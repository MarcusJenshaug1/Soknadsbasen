-- Admin impersonering: lar interne admins se Søknadsbasen som målbruker.
-- Cookie sb-impersonate inneholder rad-id; lookup skjer i src/lib/auth.ts.

CREATE TABLE "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "adminUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpersonationSession_adminUserId_endedAt_idx" ON "ImpersonationSession"("adminUserId", "endedAt");
CREATE INDEX "ImpersonationSession_targetUserId_endedAt_idx" ON "ImpersonationSession"("targetUserId", "endedAt");

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ImpersonationSession"
  ADD CONSTRAINT "ImpersonationSession_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
