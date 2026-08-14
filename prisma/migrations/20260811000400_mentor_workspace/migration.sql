-- Mentor workspace, session ownership and durable email outbox.

CREATE TYPE "NotificationKind" AS ENUM ('ACCOUNT_WELCOME', 'SUPPORT_OPPORTUNITY', 'SESSION_INVITE', 'WEEKLY_PROGRESS', 'GENERAL');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

ALTER TABLE "Session"
  ADD COLUMN "facilitatorId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isCohortWide" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "recipientId" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "subject" TEXT NOT NULL,
  "htmlBody" TEXT NOT NULL,
  "textBody" TEXT,
  "relatedEntityType" TEXT,
  "relatedEntityId" TEXT,
  "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Session_facilitatorId_startsAt_idx" ON "Session"("facilitatorId", "startsAt");
CREATE INDEX "Session_participantIds_idx" ON "Session" USING GIN ("participantIds");
CREATE INDEX "Notification_status_scheduledFor_idx" ON "Notification"("status", "scheduledFor");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

ALTER TABLE "Session" ADD CONSTRAINT "Session_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
