ALTER TABLE "Person"
  ADD COLUMN "yearsExperience" INTEGER,
  ADD COLUMN "profilePhotoKey" TEXT,
  ADD COLUMN "profilePhotoMimeType" TEXT,
  ADD CONSTRAINT "Person_yearsExperience_check" CHECK ("yearsExperience" IS NULL OR ("yearsExperience" BETWEEN 0 AND 70));

ALTER TABLE "Milestone"
  ADD COLUMN "isFinalized" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Milestone" SET "isFinalized" = true;

ALTER TABLE "Session"
  ADD COLUMN "insights" TEXT,
  ADD COLUMN "learnings" TEXT,
  ADD COLUMN "decisions" TEXT,
  ADD COLUMN "followUpAt" TIMESTAMP(3),
  ADD COLUMN "recurrenceGroupId" TEXT;

CREATE INDEX "Session_recurrenceGroupId_startsAt_idx" ON "Session"("recurrenceGroupId", "startsAt");
