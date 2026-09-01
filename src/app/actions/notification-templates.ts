'use server';

import { NotificationKind, NotificationStatus, NotificationTemplateKey } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { sendQueuedNotification } from '@/lib/email';
import { enumValue, requiredText } from '@/lib/form';
import { NOTIFICATION_TEMPLATE_DEFAULTS, renderNotificationTemplate, sampleTemplateVariables } from '@/lib/notification-templates';
import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const KIND_BY_TEMPLATE: Record<NotificationTemplateKey, NotificationKind> = {
  ACCOUNT_WELCOME: NotificationKind.ACCOUNT_WELCOME,
  TASK_ASSIGNED: NotificationKind.TASK_ASSIGNED,
  TASK_REMINDER: NotificationKind.TASK_REMINDER,
  SESSION_INVITE: NotificationKind.SESSION_INVITE,
  SESSION_REMINDER: NotificationKind.SESSION_REMINDER,
};

function validateVariables(key: NotificationTemplateKey, ...templates: string[]) {
  const allowed = new Set(NOTIFICATION_TEMPLATE_DEFAULTS[key].variables);
  const used = templates.flatMap((template) => [...template.matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g)].map((match) => match[1]));
  const unsupported = [...new Set(used.filter((variable) => !allowed.has(variable)))];
  if (unsupported.length) throw new Error(`Unsupported placeholder(s): ${unsupported.join(', ')}`);
}

export async function updateNotificationTemplateAction(formData: FormData) {
  const actor = await requirePermission('notification:manage');
  const key = enumValue(NotificationTemplateKey, formData.get('key'), 'key');
  const subjectTemplate = requiredText(formData, 'subjectTemplate', 240);
  const bodyTemplate = requiredText(formData, 'bodyTemplate', 5000);
  validateVariables(key, subjectTemplate, bodyTemplate);
  const template = await prisma.$transaction(async (tx) => {
    const updated = await tx.notificationTemplate.upsert({
      where: { key },
      update: { subjectTemplate, bodyTemplate, isActive: formData.get('isActive') === 'on', autoSend: formData.get('autoSend') === 'on' },
      create: { key, name: NOTIFICATION_TEMPLATE_DEFAULTS[key].name, subjectTemplate, bodyTemplate, isActive: formData.get('isActive') === 'on', autoSend: formData.get('autoSend') === 'on' },
    });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'NotificationTemplate', entityId: updated.id, action: 'updated', summary: `Updated email automation: ${updated.name}`, meta: { key, isActive: updated.isActive, autoSend: updated.autoSend } }) });
    return updated;
  });
  void template.id;
  revalidatePath('/settings');
  revalidatePath('/notifications');
}

export async function sendNotificationTemplateTestAction(formData: FormData) {
  const actor = await requirePermission('notification:manage');
  const key = enumValue(NotificationTemplateKey, formData.get('key'), 'key');
  const rendered = await renderNotificationTemplate(key, sampleTemplateVariables(key));
  const notification = await prisma.notification.create({ data: {
    recipientId: actor.user.id,
    recipientEmail: actor.user.email,
    kind: KIND_BY_TEMPLATE[key],
    status: NotificationStatus.PENDING,
    subject: `[TEST] ${rendered.subject}`,
    htmlBody: rendered.html,
    textBody: rendered.text,
    relatedEntityType: 'NotificationTemplateTest',
    relatedEntityId: key,
  } });
  await sendQueuedNotification(notification.id);
  await prisma.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'NotificationTemplate', entityId: key, action: 'test_sent', summary: `Sent ${NOTIFICATION_TEMPLATE_DEFAULTS[key].name} test to ${actor.user.email}` }) });
  revalidatePath('/settings');
  revalidatePath('/notifications');
}
