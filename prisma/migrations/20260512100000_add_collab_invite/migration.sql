-- CreateEnum
CREATE TYPE "CollabResourceKind" AS ENUM ('cv', 'letter', 'application');

-- CreateEnum
CREATE TYPE "CollabSuggestionStatus" AS ENUM ('pending', 'accepted', 'rejected');

-- CreateTable: CollabInvite
CREATE TABLE "CollabInvite" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "resourceKind" "CollabResourceKind" NOT NULL,
    "resourceId" UUID NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollabInvite_token_key" ON "CollabInvite"("token");
CREATE INDEX "CollabInvite_ownerId_idx" ON "CollabInvite"("ownerId");

ALTER TABLE "CollabInvite" ADD CONSTRAINT "CollabInvite_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CollabSuggestion
CREATE TABLE "CollabSuggestion" (
    "id" UUID NOT NULL,
    "inviteId" UUID NOT NULL,
    "resourceKind" "CollabResourceKind" NOT NULL,
    "resourceId" UUID NOT NULL,
    "fieldPath" TEXT NOT NULL,
    "beforeValue" JSONB NOT NULL,
    "afterValue" JSONB NOT NULL,
    "authorName" TEXT NOT NULL,
    "status" "CollabSuggestionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,

    CONSTRAINT "CollabSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollabSuggestion_resourceKind_resourceId_status_idx"
  ON "CollabSuggestion"("resourceKind", "resourceId", "status");
CREATE INDEX "CollabSuggestion_inviteId_idx" ON "CollabSuggestion"("inviteId");

ALTER TABLE "CollabSuggestion" ADD CONSTRAINT "CollabSuggestion_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "CollabInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: CollabSession
CREATE TABLE "CollabSession" (
    "id" UUID NOT NULL,
    "inviteId" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CollabSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollabSession_inviteId_endedAt_idx" ON "CollabSession"("inviteId", "endedAt");

ALTER TABLE "CollabSession" ADD CONSTRAINT "CollabSession_inviteId_fkey"
  FOREIGN KEY ("inviteId") REFERENCES "CollabInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
