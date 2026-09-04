import 'server-only';

import { NotificationKind, NotificationStatus, NotificationTemplateKey } from '@prisma/client';
import { processScheduledEmailMessages, sendQueuedNotification } from '@/lib/email';
import { renderNotificationTemplate, type TemplateVariables } from '@/lib/notification-templates';
import { prisma } from '@/lib/prisma';

const TEMPLATE_BY_KIND: Partial<Record<NotificationKind, NotificationTemplateKey>> = {
  ACCOUNT_WELCOME: NotificationTemplateKey.ACCOUNT_WELCOME,
  TASK_ASSIGNED: NotificationTemplateKey.TASK_ASSIGNED,
  TASK_REMINDER: NotificationTemplateKey.TASK_REMINDER,
  SESSION_INVITE: NotificationTemplateKey.SESSION_INVITE,
  SESSION_REMINDER: NotificationTemplateKey.SESSION_REMINDER,
};

export async function queueTemplatedNotification(input: {
  recipientId?: string | null;
  recipientEmail: string;
  kind: NotificationKind;
  templateKey: NotificationTemplateKey;
  variables: TemplateVariables;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledFor?: Date;
}) {
  const template = await renderNotificationTemplate(input.templateKey, input.variables);
  if (!template.isActive) return null;
  const scheduledFor = input.scheduledFor ?? new Date();
  const notification = await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      recipientEmail: input.recipientEmail,
      kind: input.kind,
      subject: template.subject,
      htmlBody: template.html,
      textBody: template.text,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      scheduledFor,
    },
  });
  if (template.autoSend && scheduledFor <= new Date()) {
    try { await sendQueuedNotification(notification.id); } catch { /* Failure remains visible and retryable in the outbox. */ }
  }
  return notification;
}

export async function processAutomaticNotifications(limit = 50) {
  const templates = await prisma.notificationTemplate.findMany({ select: { key: true, isActive: true, autoSend: true } });
  const stored = new Map(templates.map((template) => [template.key, template]));
  // Match the defaults used when rendering templates, including unsaved defaults.
  const enabledKinds = (Object.entries(TEMPLATE_BY_KIND) as [NotificationKind, NotificationTemplateKey][])
    .filter(([, key]) => {
      const template = stored.get(key);
      return !template || (template.isActive && template.autoSend);
    }).map(([kind]) => kind);
  enabledKinds.push(NotificationKind.SUPPORT_OPPORTUNITY);
  const notifications = await prisma.notification.findMany({
    where: { kind: { in: enabledKinds }, status: NotificationStatus.PENDING, scheduledFor: { lte: new Date() }, attempts: { lt: 3 } },
    orderBy: { scheduledFor: 'asc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true, kind: true },
  });
  let sent = 0;
  let failed = 0;
  for (const notification of notifications) {
    try { await sendQueuedNotification(notification.id); sent += 1; } catch { failed += 1; }
  }
  const custom = await processScheduledEmailMessages(limit);
  return { considered: notifications.length, sent, failed, custom };
}
