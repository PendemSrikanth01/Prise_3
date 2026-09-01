ALTER TYPE "NotificationKind" ADD VALUE 'TASK_ASSIGNED';
ALTER TYPE "NotificationKind" ADD VALUE 'TASK_REMINDER';
ALTER TYPE "NotificationKind" ADD VALUE 'SESSION_REMINDER';

CREATE TYPE "NotificationTemplateKey" AS ENUM (
  'ACCOUNT_WELCOME',
  'TASK_ASSIGNED',
  'TASK_REMINDER',
  'SESSION_INVITE',
  'SESSION_REMINDER'
);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "key" "NotificationTemplateKey" NOT NULL,
  "name" TEXT NOT NULL,
  "subjectTemplate" TEXT NOT NULL,
  "bodyTemplate" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "autoSend" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");

INSERT INTO "NotificationTemplate" ("id", "key", "name", "subjectTemplate", "bodyTemplate", "isActive", "autoSend", "updatedAt") VALUES
  ('notification-template-welcome', 'ACCOUNT_WELCOME', 'Welcome', 'Welcome to the PrISE 3.0 workspace', E'Hi {{name}},\n\nYour {{role}} account is ready. Use the temporary password shared by the Program Lead, then choose a private password.\n\nOpen PrISE 3.0: {{appUrl}}', true, true, CURRENT_TIMESTAMP),
  ('notification-template-task-assigned', 'TASK_ASSIGNED', 'Task assigned', 'New task: {{taskTitle}}', E'Hi {{name}},\n\nA task has been assigned to you for {{startupName}}.\n\nTask: {{taskTitle}}\nDue: {{dueDate}}\n\nOpen task: {{appUrl}}', true, true, CURRENT_TIMESTAMP),
  ('notification-template-task-reminder', 'TASK_REMINDER', 'Task reminder', 'Reminder: {{taskTitle}} is due soon', E'Hi {{name}},\n\nYour task for {{startupName}} is due soon.\n\nTask: {{taskTitle}}\nDue: {{dueDate}}\n\nOpen task: {{appUrl}}', true, true, CURRENT_TIMESTAMP),
  ('notification-template-session-invite', 'SESSION_INVITE', 'Meeting invitation', 'Invitation: {{meetingTitle}}', E'Hi {{name}},\n\n{{meetingTitle}} with {{startupName}} is scheduled for {{meetingDate}}.\n\nJoin or view meeting: {{meetingLink}}', true, true, CURRENT_TIMESTAMP),
  ('notification-template-session-reminder', 'SESSION_REMINDER', 'Meeting reminder', 'Reminder: {{meetingTitle}} starts soon', E'Hi {{name}},\n\n{{meetingTitle}} with {{startupName}} starts at {{meetingDate}}.\n\nJoin or view meeting: {{meetingLink}}', true, true, CURRENT_TIMESTAMP);
