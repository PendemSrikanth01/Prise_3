ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'APPLICATION_PENDING';
ALTER TYPE "StartupStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "AssignmentRole" ADD VALUE IF NOT EXISTS 'INVESTOR';

CREATE TYPE "StartupMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'FINANCE', 'VIEWER');

CREATE TABLE "StartupMembership" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "role" "StartupMemberRole" NOT NULL DEFAULT 'MEMBER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StartupMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvestorStartupShare" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "investorId" TEXT NOT NULL,
  "canViewDocuments" BOOLEAN NOT NULL DEFAULT false,
  "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvestorStartupShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnboardingDocument" (
  "id" TEXT NOT NULL,
  "onboardingItemId" TEXT NOT NULL,
  "uploaderId" TEXT,
  "name" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OnboardingDocument_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "createdById" TEXT;

CREATE UNIQUE INDEX "StartupMembership_startupId_personId_key" ON "StartupMembership"("startupId", "personId");
CREATE INDEX "StartupMembership_personId_isActive_idx" ON "StartupMembership"("personId", "isActive");
CREATE INDEX "StartupMembership_startupId_role_idx" ON "StartupMembership"("startupId", "role");
CREATE UNIQUE INDEX "InvestorStartupShare_startupId_investorId_key" ON "InvestorStartupShare"("startupId", "investorId");
CREATE INDEX "InvestorStartupShare_investorId_idx" ON "InvestorStartupShare"("investorId");
CREATE INDEX "OnboardingDocument_onboardingItemId_createdAt_idx" ON "OnboardingDocument"("onboardingItemId", "createdAt");
CREATE INDEX "OnboardingDocument_uploaderId_idx" ON "OnboardingDocument"("uploaderId");
CREATE INDEX "Task_createdById_createdAt_idx" ON "Task"("createdById", "createdAt");

ALTER TABLE "StartupMembership" ADD CONSTRAINT "StartupMembership_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StartupMembership" ADD CONSTRAINT "StartupMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestorStartupShare" ADD CONSTRAINT "InvestorStartupShare_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvestorStartupShare" ADD CONSTRAINT "InvestorStartupShare_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_onboardingItemId_fkey" FOREIGN KEY ("onboardingItemId") REFERENCES "OnboardingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingDocument" ADD CONSTRAINT "OnboardingDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "StartupMembership" ("id", "startupId", "personId", "role", "isActive", "createdAt", "updatedAt")
SELECT 'legacy_' || substr(md5(p."id" || p."founderOfStartupId"), 1, 24), p."founderOfStartupId", p."id", 'OWNER'::"StartupMemberRole", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Person" p
WHERE p."founderOfStartupId" IS NOT NULL
ON CONFLICT ("startupId", "personId") DO NOTHING;
