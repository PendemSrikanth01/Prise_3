CREATE TYPE "DeliverableStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'NEEDS_REVISION', 'ARCHIVED');

ALTER TABLE "Deliverable"
  ADD COLUMN "status" "DeliverableStatus" NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "reviewerId" TEXT,
  ADD COLUMN "feedback" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE INDEX "Deliverable_status_createdAt_idx" ON "Deliverable"("status", "createdAt");
CREATE INDEX "Deliverable_reviewerId_idx" ON "Deliverable"("reviewerId");
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
