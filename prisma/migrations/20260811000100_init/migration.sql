-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PROGRAM_LEAD', 'PROGRAM_TEAM', 'INTERN', 'MENTOR', 'EXPERT', 'INVESTOR', 'FOUNDER');

-- CreateEnum
CREATE TYPE "StartupStatus" AS ENUM ('ACTIVE', 'NEEDS_ATTENTION', 'DISCONTINUED', 'WITHDRAWN', 'GRADUATED');

-- CreateEnum
CREATE TYPE "OnboardingItemType" AS ENUM ('AGREEMENT', 'BASELINE', 'PITCH_VIDEO', 'LOGO', 'FEE_PAYMENT', 'DOCUMENT_FOLDER');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION', 'NA');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION', 'NA', 'PAUSED');

-- CreateEnum
CREATE TYPE "EffortLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('MENTOR', 'INTERN', 'EXPERT', 'PROGRAM_LEAD');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "MilestoneScope" AS ENUM ('PROGRAM', 'STARTUP');

-- CreateEnum
CREATE TYPE "MilestoneAssignmentType" AS ENUM ('MANDATORY', 'SELECTABLE');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('COMMENTED', 'REVISION_REQUESTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MENTORING', 'EXPERT', 'REVIEW', 'WORKSHOP', 'PEER_LEARNING', 'FOUNDER_SHOWCASE', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "founderOfStartupId" TEXT,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupAssignment" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" TEXT NOT NULL,
    "sNo" INTEGER,
    "cohort" TEXT NOT NULL DEFAULT 'PrISE 3.0',
    "name" TEXT NOT NULL,
    "founderName" TEXT NOT NULL,
    "founderEmail" TEXT,
    "founderPhone" TEXT,
    "operationLocation" TEXT,
    "state" TEXT,
    "sector" TEXT,
    "legalStructure" TEXT,
    "actualFee" DECIMAL(10,2),
    "agreedFee" DECIMAL(10,2),
    "agreedFeeRemarks" TEXT,
    "totalFeePaid" DECIMAL(10,2) DEFAULT 0,
    "documentFolderLink" TEXT,
    "status" "StartupStatus" NOT NULL DEFAULT 'ACTIVE',
    "healthStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingItem" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "type" "OnboardingItemType" NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneTemplate" (
    "id" TEXT NOT NULL,
    "phase" INTEGER NOT NULL,
    "phaseName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keyActivity" TEXT NOT NULL,
    "deliverable" TEXT NOT NULL,
    "effort" "EffortLevel" NOT NULL,
    "scope" "MilestoneScope" NOT NULL DEFAULT 'STARTUP',
    "assignmentType" "MilestoneAssignmentType" NOT NULL DEFAULT 'SELECTABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MilestoneTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "templateId" TEXT,
    "phase" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "keyActivity" TEXT,
    "deliverable" TEXT,
    "effort" "EffortLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "evidenceUrl" TEXT,
    "reviewerId" TEXT,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "startupId" TEXT,
    "milestoneId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "uploaderId" TEXT,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneReview" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "requestedById" TEXT,
    "assignedToId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "resourceType" "AssignmentRole",
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "startupId" TEXT,
    "title" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "participantIds" TEXT[],
    "meetingProvider" TEXT,
    "externalEventId" TEXT,
    "meetingUrl" TEXT,
    "outcome" TEXT,
    "nextActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" TEXT NOT NULL,
    "startupId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Person_founderOfStartupId_key" ON "Person"("founderOfStartupId");

-- CreateIndex
CREATE INDEX "Person_role_idx" ON "Person"("role");

-- CreateIndex
CREATE INDEX "StartupAssignment_personId_idx" ON "StartupAssignment"("personId");

-- CreateIndex
CREATE INDEX "StartupAssignment_startupId_idx" ON "StartupAssignment"("startupId");

-- CreateIndex
CREATE UNIQUE INDEX "StartupAssignment_startupId_personId_role_key" ON "StartupAssignment"("startupId", "personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_sNo_key" ON "Startup"("sNo");

-- CreateIndex
CREATE INDEX "Startup_status_idx" ON "Startup"("status");

-- CreateIndex
CREATE INDEX "OnboardingItem_status_idx" ON "OnboardingItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingItem_startupId_type_key" ON "OnboardingItem"("startupId", "type");

-- CreateIndex
CREATE INDEX "MilestoneTemplate_phase_idx" ON "MilestoneTemplate"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneTemplate_phase_title_key" ON "MilestoneTemplate"("phase", "title");

-- CreateIndex
CREATE INDEX "Milestone_startupId_status_idx" ON "Milestone"("startupId", "status");

-- CreateIndex
CREATE INDEX "Milestone_phase_idx" ON "Milestone"("phase");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_startupId_idx" ON "Task"("startupId");

-- CreateIndex
CREATE INDEX "Deliverable_milestoneId_createdAt_idx" ON "Deliverable"("milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "MilestoneReview_milestoneId_createdAt_idx" ON "MilestoneReview"("milestoneId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_startupId_status_idx" ON "SupportRequest"("startupId", "status");

-- CreateIndex
CREATE INDEX "SupportRequest_assignedToId_status_idx" ON "SupportRequest"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "Session_startsAt_status_idx" ON "Session"("startsAt", "status");

-- CreateIndex
CREATE INDEX "Session_startupId_idx" ON "Session"("startupId");

-- CreateIndex
CREATE INDEX "PaymentInstallment_startupId_status_idx" ON "PaymentInstallment"("startupId", "status");

-- CreateIndex
CREATE INDEX "PaymentInstallment_dueDate_status_idx" ON "PaymentInstallment"("dueDate", "status");

-- CreateIndex
CREATE INDEX "ActivityLog_entityType_entityId_idx" ON "ActivityLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_founderOfStartupId_fkey" FOREIGN KEY ("founderOfStartupId") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupAssignment" ADD CONSTRAINT "StartupAssignment_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupAssignment" ADD CONSTRAINT "StartupAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingItem" ADD CONSTRAINT "OnboardingItem_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MilestoneTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneReview" ADD CONSTRAINT "MilestoneReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportRequest" ADD CONSTRAINT "SupportRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
