CREATE TYPE "ProgramActionLifecycle" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "ProgramActionStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'WAITING', 'BLOCKED', 'DONE');
CREATE TYPE "ProgramActionCategory" AS ENUM ('OUTREACH', 'OPERATIONS', 'WORKSHOP', 'MENTORING', 'MASTERCLASS', 'REPORTING', 'STARTUP_PROGRESS', 'EVENT');
CREATE TYPE "ProgramCoverageType" AS ENUM ('NONE', 'AGREEMENT', 'BASELINE', 'PAYMENT', 'MILESTONE_ASSIGNMENT');

CREATE TABLE "ProgramAction" (
  "id" TEXT NOT NULL,
  "cohort" TEXT NOT NULL DEFAULT 'PrISE 3.0',
  "phase" INTEGER NOT NULL,
  "phaseName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "category" "ProgramActionCategory" NOT NULL DEFAULT 'OPERATIONS',
  "lifecycle" "ProgramActionLifecycle" NOT NULL DEFAULT 'PLANNED',
  "status" "ProgramActionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "coverageType" "ProgramCoverageType" NOT NULL DEFAULT 'NONE',
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "ownerId" TEXT,
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramAction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramActionSubtask" (
  "id" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "status" "ProgramActionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "ownerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgramActionSubtask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgramActionEvidence" (
  "id" TEXT NOT NULL,
  "actionId" TEXT NOT NULL,
  "subtaskId" TEXT,
  "uploaderId" TEXT,
  "reviewerId" TEXT,
  "name" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "DeliverableStatus" NOT NULL DEFAULT 'SUBMITTED',
  "description" TEXT,
  "feedback" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProgramActionEvidence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramAction_cohort_phase_title_key" ON "ProgramAction"("cohort", "phase", "title");
CREATE INDEX "ProgramAction_cohort_phase_position_idx" ON "ProgramAction"("cohort", "phase", "position");
CREATE INDEX "ProgramAction_lifecycle_status_idx" ON "ProgramAction"("lifecycle", "status");
CREATE INDEX "ProgramAction_ownerId_status_dueDate_idx" ON "ProgramAction"("ownerId", "status", "dueDate");
CREATE INDEX "ProgramAction_dueDate_status_idx" ON "ProgramAction"("dueDate", "status");
CREATE UNIQUE INDEX "ProgramActionSubtask_actionId_title_key" ON "ProgramActionSubtask"("actionId", "title");
CREATE INDEX "ProgramActionSubtask_actionId_position_idx" ON "ProgramActionSubtask"("actionId", "position");
CREATE INDEX "ProgramActionSubtask_ownerId_status_dueDate_idx" ON "ProgramActionSubtask"("ownerId", "status", "dueDate");
CREATE INDEX "ProgramActionEvidence_actionId_createdAt_idx" ON "ProgramActionEvidence"("actionId", "createdAt");
CREATE INDEX "ProgramActionEvidence_subtaskId_createdAt_idx" ON "ProgramActionEvidence"("subtaskId", "createdAt");
CREATE INDEX "ProgramActionEvidence_status_createdAt_idx" ON "ProgramActionEvidence"("status", "createdAt");
CREATE INDEX "ProgramActionEvidence_uploaderId_idx" ON "ProgramActionEvidence"("uploaderId");
CREATE INDEX "ProgramActionEvidence_reviewerId_idx" ON "ProgramActionEvidence"("reviewerId");

ALTER TABLE "ProgramAction" ADD CONSTRAINT "ProgramAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramAction" ADD CONSTRAINT "ProgramAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramAction" ADD CONSTRAINT "ProgramAction_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramActionSubtask" ADD CONSTRAINT "ProgramActionSubtask_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProgramAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramActionSubtask" ADD CONSTRAINT "ProgramActionSubtask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramActionEvidence" ADD CONSTRAINT "ProgramActionEvidence_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "ProgramAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramActionEvidence" ADD CONSTRAINT "ProgramActionEvidence_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "ProgramActionSubtask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramActionEvidence" ADD CONSTRAINT "ProgramActionEvidence_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgramActionEvidence" ADD CONSTRAINT "ProgramActionEvidence_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
