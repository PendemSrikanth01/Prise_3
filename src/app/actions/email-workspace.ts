'use server';

import { NotificationStatus, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auditData } from '@/lib/audit';
import { normalizeRecipients } from '@/lib/email-addresses';
import { emailDeliveryConfigured, renderOrganizationEmail, sendQueuedEmailMessage } from '@/lib/email';
import { optionalDateTime, requiredText, text } from '@/lib/form';
import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { removePrivateUpload, storePrivateUpload } from '@/lib/uploads';

export type EmailWorkspaceState = { error?: string; success?: string } | undefined;

function formStrings(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === 'string');
}

export async function composeEmailAction(_: EmailWorkspaceState, formData: FormData): Promise<EmailWorkspaceState> {
  let storedKey: string | null = null;
  try {
    const actor = await requirePermission('notification:manage');
    const selectedIds = formStrings(formData, 'recipientIds').slice(0, 50);
    const groups = new Set(formStrings(formData, 'groups'));
    const roleFilters: Role[] = [];
    if (groups.has('INCUBATEES')) roleFilters.push(Role.FOUNDER);
    if (groups.has('MENTORS')) roleFilters.push(Role.MENTOR);
    if (groups.has('PROGRAM')) roleFilters.push(Role.PROGRAM_LEAD, Role.PROGRAM_TEAM, Role.INTERN, Role.EXPERT);
    const people = await prisma.person.findMany({
      where: { isActive: true, OR: [{ id: { in: selectedIds } }, ...(roleFilters.length ? [{ role: { in: roleFilters } }] : [])] },
      select: { email: true },
    });
    const recipients = normalizeRecipients({
      to: [...people.map(({ email }) => email), text(formData, 'toEmails', 5000)],
      cc: [text(formData, 'ccEmails', 5000)],
      bcc: [text(formData, 'bccEmails', 5000)],
    });
    const subject = requiredText(formData, 'subject', 240);
    const body = requiredText(formData, 'body', 10_000);
    const requestedSchedule = optionalDateTime(formData, 'scheduledFor');
    if (requestedSchedule && requestedSchedule > new Date() && !process.env.AUTOMATION_SECRET) {
      throw new Error('Scheduling is not configured yet. Send now, or ask the program lead to enable the notification worker.');
    }
    const scheduledFor = requestedSchedule && requestedSchedule > new Date() ? requestedSchedule : new Date();
    const file = formData.get('attachment');
    const hasFile = file instanceof File && file.size > 0;
    const stored = hasFile ? await storePrivateUpload(file as File) : null;
    storedKey = stored?.storageKey ?? null;
    const fromEmail = process.env.MAIL_FROM || 'PrISE 3.0 <notifications@mail.prise.bvcsrb.org>';
    const replyTo = process.env.MAIL_REPLY_TO || 'prise@balavikasa.org';
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.emailMessage.create({ data: {
        createdById: actor.user.id,
        fromEmail,
        replyTo,
        toEmails: recipients.to,
        ccEmails: recipients.cc,
        bccEmails: recipients.bcc,
        subject,
        textBody: body,
        htmlBody: renderOrganizationEmail(subject, body),
        scheduledFor,
        attachmentStorageKey: stored?.storageKey,
        attachmentName: hasFile ? (file as File).name.slice(0, 240) : null,
        attachmentMimeType: stored?.mimeType,
        attachmentSizeBytes: stored?.sizeBytes,
      } });
      await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'EmailMessage', entityId: created.id, action: scheduledFor > new Date() ? 'scheduled' : 'queued', summary: `Prepared organization email: ${subject}`, meta: { recipients: recipients.to.length, cc: recipients.cc.length, bcc: recipients.bcc.length } }) });
      return created;
    });
    storedKey = null;
    if (scheduledFor <= new Date() && emailDeliveryConfigured()) {
      try { await sendQueuedEmailMessage(message.id); } catch { /* The failed message remains visible and retryable. */ }
    }
    revalidatePath('/notifications');
    return { success: scheduledFor > new Date() ? 'Email scheduled successfully.' : 'Email added to the outbox.' };
  } catch (error) {
    if (storedKey) await removePrivateUpload(storedKey);
    return { error: error instanceof Error ? error.message : 'Email could not be prepared.' };
  }
}

export async function retryEmailMessageAction(formData: FormData) {
  await requirePermission('notification:manage');
  const id = requiredText(formData, 'messageId', 64);
  await prisma.emailMessage.updateMany({ where: { id, status: NotificationStatus.FAILED }, data: { scheduledFor: new Date() } });
  await sendQueuedEmailMessage(id);
  revalidatePath('/notifications');
}

export async function sendEmailMessageNowAction(formData: FormData) {
  await requirePermission('notification:manage');
  const id = requiredText(formData, 'messageId', 64);
  await prisma.emailMessage.updateMany({ where: { id, status: NotificationStatus.PENDING }, data: { scheduledFor: new Date() } });
  await sendQueuedEmailMessage(id);
  revalidatePath('/notifications');
}

export async function cancelEmailMessageAction(formData: FormData) {
  const actor = await requirePermission('notification:manage');
  const id = requiredText(formData, 'messageId', 64);
  const message = await prisma.emailMessage.findFirstOrThrow({ where: { id, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } }, select: { subject: true, attachmentStorageKey: true } });
  await prisma.$transaction(async (tx) => {
    await tx.emailMessage.update({ where: { id }, data: { status: NotificationStatus.CANCELLED, attachmentStorageKey: null, attachmentName: null, attachmentMimeType: null, attachmentSizeBytes: null } });
    await tx.activityLog.create({ data: auditData({ actor: actor.user, entityType: 'EmailMessage', entityId: id, action: 'cancelled', summary: `Cancelled organization email: ${message.subject}` }) });
  });
  if (message.attachmentStorageKey) await removePrivateUpload(message.attachmentStorageKey);
  revalidatePath('/notifications');
}
