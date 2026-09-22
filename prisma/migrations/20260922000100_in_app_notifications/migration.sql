-- CreateEnum
CREATE TYPE "InAppNotificationKind" AS ENUM ('MENTOR_MAPPING_ADDED', 'MENTOR_MAPPING_REMOVED');

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" "InAppNotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "eventKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InAppNotification_eventKey_key" ON "InAppNotification"("eventKey");

-- CreateIndex
CREATE INDEX "InAppNotification_recipientId_readAt_createdAt_idx" ON "InAppNotification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "InAppNotification_relatedEntityType_relatedEntityId_idx" ON "InAppNotification"("relatedEntityType", "relatedEntityId");

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
