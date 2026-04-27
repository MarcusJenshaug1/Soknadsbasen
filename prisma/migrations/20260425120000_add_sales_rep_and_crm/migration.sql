-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'selger', 'admin');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user';

-- Backfill: existing admins get role='admin' so the deprecated isAdmin column can be dropped next release.
UPDATE "User" SET "role" = 'admin' WHERE "isAdmin" = true;

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "salesRepId" UUID;

-- CreateIndex
CREATE INDEX "Organization_salesRepId_idx" ON "Organization"("salesRepId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "SalesRepProfile" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "commissionRateBp" INTEGER NOT NULL DEFAULT 1000,
    "monthlyQuotaCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'invited',
    "inviteToken" TEXT,
    "inviteExpiresAt" TIMESTAMP(3),
    "lastAssignedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesRepProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesRepProfile_userId_key" ON "SalesRepProfile"("userId");
CREATE UNIQUE INDEX "SalesRepProfile_inviteToken_key" ON "SalesRepProfile"("inviteToken");
CREATE INDEX "SalesRepProfile_status_lastAssignedAt_idx" ON "SalesRepProfile"("status", "lastAssignedAt");

-- AddForeignKey
ALTER TABLE "SalesRepProfile" ADD CONSTRAINT "SalesRepProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "salesRepId" UUID NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Ny',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "estimatedValueCents" INTEGER NOT NULL DEFAULT 0,
    "expectedSeats" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyWebsite" TEXT,
    "notes" TEXT,
    "orgInquiryId" TEXT,
    "orgId" TEXT,
    "lostReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_orgInquiryId_key" ON "Lead"("orgInquiryId");
CREATE UNIQUE INDEX "Lead_orgId_key" ON "Lead"("orgId");
CREATE INDEX "Lead_salesRepId_stage_idx" ON "Lead"("salesRepId", "stage");
CREATE INDEX "Lead_stage_closedAt_idx" ON "Lead"("stage", "closedAt");
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_orgInquiryId_fkey" FOREIGN KEY ("orgInquiryId") REFERENCES "OrgInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CrmContact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedinUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmContact_orgId_idx" ON "CrmContact"("orgId");
CREATE INDEX "CrmContact_email_idx" ON "CrmContact"("email");

-- AddForeignKey
ALTER TABLE "CrmContact" ADD CONSTRAINT "CrmContact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadContactLink" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Bruker',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadContactLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadContactLink_leadId_contactId_key" ON "LeadContactLink"("leadId", "contactId");
CREATE INDEX "LeadContactLink_contactId_idx" ON "LeadContactLink"("contactId");

-- AddForeignKey
ALTER TABLE "LeadContactLink" ADD CONSTRAINT "LeadContactLink_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadContactLink" ADD CONSTRAINT "LeadContactLink_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "CrmContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CrmActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmActivity_leadId_createdAt_idx" ON "CrmActivity"("leadId", "createdAt");
CREATE INDEX "CrmActivity_createdById_dueAt_idx" ON "CrmActivity"("createdById", "dueAt");

-- AddForeignKey
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmActivity" ADD CONSTRAINT "CrmActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" TEXT NOT NULL,
    "salesRepId" UUID NOT NULL,
    "orgId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "invoiceAmountCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3) NOT NULL,
    "payoutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEntry_stripeInvoiceId_key" ON "CommissionEntry"("stripeInvoiceId");
CREATE INDEX "CommissionEntry_salesRepId_status_idx" ON "CommissionEntry"("salesRepId", "status");
CREATE INDEX "CommissionEntry_orgId_paidAt_idx" ON "CommissionEntry"("orgId", "paidAt");
CREATE INDEX "CommissionEntry_status_holdUntil_idx" ON "CommissionEntry"("status", "holdUntil");

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "salesRepId" UUID NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionPayout_salesRepId_paidAt_idx" ON "CommissionPayout"("salesRepId", "paidAt");

-- AddForeignKey
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionEntry" ADD CONSTRAINT "CommissionEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "CommissionPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
