-- Authentication, reviewer attribution, audit context, and query-path indexes.

ALTER TABLE "Person"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "AuthSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LoginAttempt" (
  "id" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "successful" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OnboardingItem" ADD COLUMN "reviewedById" TEXT;

ALTER TABLE "ActivityLog"
  ADD COLUMN "actorRole" "Role",
  ADD COLUMN "startupId" TEXT,
  ADD COLUMN "summary" TEXT;
UPDATE "ActivityLog" SET "summary" = "action" WHERE "summary" IS NULL;
ALTER TABLE "ActivityLog" ALTER COLUMN "summary" SET NOT NULL;

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_personId_revokedAt_idx" ON "AuthSession"("personId", "revokedAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "LoginAttempt_emailHash_ipHash_createdAt_idx" ON "LoginAttempt"("emailHash", "ipHash", "createdAt");
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");
CREATE INDEX "Person_isActive_idx" ON "Person"("isActive");
CREATE INDEX "OnboardingItem_reviewedById_idx" ON "OnboardingItem"("reviewedById");
CREATE INDEX "Milestone_templateId_idx" ON "Milestone"("templateId");
CREATE INDEX "Milestone_reviewerId_idx" ON "Milestone"("reviewerId");
CREATE UNIQUE INDEX "Milestone_startupId_templateId_key" ON "Milestone"("startupId", "templateId");
CREATE INDEX "Task_milestoneId_idx" ON "Task"("milestoneId");
CREATE INDEX "Deliverable_uploaderId_idx" ON "Deliverable"("uploaderId");
CREATE INDEX "MilestoneReview_reviewerId_idx" ON "MilestoneReview"("reviewerId");
CREATE INDEX "ActivityLog_startupId_createdAt_idx" ON "ActivityLog"("startupId", "createdAt");
CREATE INDEX "ActivityLog_actorId_createdAt_idx" ON "ActivityLog"("actorId", "createdAt");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnboardingItem" ADD CONSTRAINT "OnboardingItem_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
