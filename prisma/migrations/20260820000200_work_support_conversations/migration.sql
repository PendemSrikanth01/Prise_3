-- Startup-scoped collaboration: task discussions and audience-controlled support threads.
CREATE TYPE "SupportAudience" AS ENUM ('STARTUP_TEAM', 'STARTUP_AND_MENTORS', 'PROGRAM_PRIVATE', 'SELECTED_PEOPLE');

ALTER TABLE "SupportRequest"
  ADD COLUMN "audience" "SupportAudience" NOT NULL DEFAULT 'STARTUP_AND_MENTORS';

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "TaskComment_body_check" CHECK (char_length(btrim("body")) BETWEEN 1 AND 3000)
);

CREATE TABLE "SupportParticipant" (
  "id" TEXT NOT NULL,
  "supportRequestId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportParticipant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportParticipant_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SupportMessage" (
  "id" TEXT NOT NULL,
  "supportRequestId" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportMessage_supportRequestId_fkey" FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportMessage_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SupportMessage_body_check" CHECK (char_length(btrim("body")) BETWEEN 1 AND 3000)
);

CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");
CREATE INDEX "TaskComment_startupId_createdAt_idx" ON "TaskComment"("startupId", "createdAt");
CREATE INDEX "TaskComment_authorId_createdAt_idx" ON "TaskComment"("authorId", "createdAt");

CREATE UNIQUE INDEX "SupportParticipant_supportRequestId_personId_key" ON "SupportParticipant"("supportRequestId", "personId");
CREATE INDEX "SupportParticipant_personId_supportRequestId_idx" ON "SupportParticipant"("personId", "supportRequestId");

CREATE INDEX "SupportMessage_supportRequestId_createdAt_idx" ON "SupportMessage"("supportRequestId", "createdAt");
CREATE INDEX "SupportMessage_startupId_createdAt_idx" ON "SupportMessage"("startupId", "createdAt");
CREATE INDEX "SupportMessage_authorId_createdAt_idx" ON "SupportMessage"("authorId", "createdAt");
