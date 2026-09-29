ALTER TYPE "NotificationKind" ADD VALUE 'MENTOR_AVAILABILITY_PUBLISHED';
ALTER TYPE "NotificationKind" ADD VALUE 'CORE_MENTOR_SELECTED';

ALTER TYPE "NotificationTemplateKey" ADD VALUE 'MENTOR_AVAILABILITY_PUBLISHED';
ALTER TYPE "NotificationTemplateKey" ADD VALUE 'CORE_MENTOR_SELECTED';

ALTER TYPE "InAppNotificationKind" ADD VALUE 'MENTOR_AVAILABILITY_PUBLISHED';
ALTER TYPE "InAppNotificationKind" ADD VALUE 'CORE_MENTOR_SELECTED';

ALTER TABLE "Person" ADD COLUMN "availabilityPublishedAt" TIMESTAMP(3);
ALTER TABLE "StartupAssignment" ADD COLUMN "isCoreMentor" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN "ccEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Session" ADD COLUMN "externalAttendeeEmails" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "StartupAssignment_one_core_mentor_per_startup"
ON "StartupAssignment" ("startupId")
WHERE "role" = 'MENTOR' AND "isCoreMentor" = true;
