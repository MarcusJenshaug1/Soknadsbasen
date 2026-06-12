-- AI-kvotesystem: månedlig forbruk (AiUsage), kjøpt påfyll (AiCreditBalance),
-- idempotens-ledger for Stripe-grants (AiCreditGrant), kostnadslogg
-- (AiUsageEvent), og admin-satt evig-kvote-flagg på User.
-- Unique-constraints her er korrekthets-constraints og hører til tabellene;
-- sekundærindekser kommer i egen migrasjon (indeks-regelen).

ALTER TABLE "User" ADD COLUMN "aiUnlimited" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsage_userId_periodStart_key" ON "AiUsage"("userId", "periodStart");

CREATE TABLE "AiCreditBalance" (
    "userId" UUID NOT NULL,
    "extra" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiCreditBalance_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "AiCreditGrant" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiCreditGrant_stripeSessionId_key" ON "AiCreditGrant"("stripeSessionId");

CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCreditBalance" ADD CONSTRAINT "AiCreditBalance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiCreditGrant" ADD CONSTRAINT "AiCreditGrant_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiUsageEvent" ADD CONSTRAINT "AiUsageEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rollback:
--   DROP TABLE "AiUsageEvent"; DROP TABLE "AiCreditGrant";
--   DROP TABLE "AiCreditBalance"; DROP TABLE "AiUsage";
--   ALTER TABLE "User" DROP COLUMN "aiUnlimited";
