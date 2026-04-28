-- CreateTable
CREATE TABLE "ResumeShareLink" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "resumeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeShareLink_token_key" ON "ResumeShareLink"("token");

-- CreateIndex
CREATE INDEX "ResumeShareLink_token_idx" ON "ResumeShareLink"("token");

-- CreateIndex
CREATE INDEX "ResumeShareLink_userId_idx" ON "ResumeShareLink"("userId");

-- AddForeignKey
ALTER TABLE "ResumeShareLink" ADD CONSTRAINT "ResumeShareLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
