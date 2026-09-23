ALTER TYPE "InAppNotificationKind" ADD VALUE 'CHAT_MESSAGE';

CREATE TABLE "MentorConversation" (
  "id" TEXT NOT NULL,
  "startupId" TEXT NOT NULL,
  "mentorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentorChatMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MentorChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MentorChatMessage_body_check" CHECK (char_length(btrim("body")) BETWEEN 1 AND 3000)
);

CREATE TABLE "MentorConversationRead" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MentorConversationRead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebPushSubscription" (
  "id" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "lastFailedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MentorConversation_startupId_mentorId_key" ON "MentorConversation"("startupId", "mentorId");
CREATE INDEX "MentorConversation_mentorId_updatedAt_idx" ON "MentorConversation"("mentorId", "updatedAt");
CREATE INDEX "MentorConversation_startupId_updatedAt_idx" ON "MentorConversation"("startupId", "updatedAt");
CREATE INDEX "MentorChatMessage_conversationId_createdAt_idx" ON "MentorChatMessage"("conversationId", "createdAt");
CREATE INDEX "MentorChatMessage_authorId_createdAt_idx" ON "MentorChatMessage"("authorId", "createdAt");
CREATE UNIQUE INDEX "MentorConversationRead_conversationId_personId_key" ON "MentorConversationRead"("conversationId", "personId");
CREATE INDEX "MentorConversationRead_personId_lastReadAt_idx" ON "MentorConversationRead"("personId", "lastReadAt");
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX "WebPushSubscription_personId_updatedAt_idx" ON "WebPushSubscription"("personId", "updatedAt");

ALTER TABLE "MentorConversation" ADD CONSTRAINT "MentorConversation_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorConversation" ADD CONSTRAINT "MentorConversation_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorChatMessage" ADD CONSTRAINT "MentorChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MentorConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorChatMessage" ADD CONSTRAINT "MentorChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MentorConversationRead" ADD CONSTRAINT "MentorConversationRead_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MentorConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentorConversationRead" ADD CONSTRAINT "MentorConversationRead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
