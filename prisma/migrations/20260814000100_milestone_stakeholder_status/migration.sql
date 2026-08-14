CREATE TYPE "MilestoneStakeholderLane" AS ENUM ('STARTUP', 'MENTOR', 'PROGRAM');
CREATE TYPE "MilestoneStakeholderState" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION', 'BLOCKED');

ALTER TABLE "Deliverable" ADD COLUMN "stakeholderLane" "MilestoneStakeholderLane";

CREATE TABLE "MilestoneStakeholderStatus" (
  "id" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "lane" "MilestoneStakeholderLane" NOT NULL,
  "state" "MilestoneStakeholderState" NOT NULL DEFAULT 'NOT_STARTED',
  "note" TEXT,
  "updatedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MilestoneStakeholderStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MilestoneStakeholderStatus_milestoneId_lane_key" ON "MilestoneStakeholderStatus"("milestoneId", "lane");
CREATE INDEX "MilestoneStakeholderStatus_lane_state_idx" ON "MilestoneStakeholderStatus"("lane", "state");
CREATE INDEX "MilestoneStakeholderStatus_updatedById_updatedAt_idx" ON "MilestoneStakeholderStatus"("updatedById", "updatedAt");
CREATE INDEX "Deliverable_milestoneId_stakeholderLane_createdAt_idx" ON "Deliverable"("milestoneId", "stakeholderLane", "createdAt");

ALTER TABLE "MilestoneStakeholderStatus" ADD CONSTRAINT "MilestoneStakeholderStatus_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MilestoneStakeholderStatus" ADD CONSTRAINT "MilestoneStakeholderStatus_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
