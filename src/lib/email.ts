import 'server-only';

import { NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { readPrivateUpload } from '@/lib/uploads';

export function emailDeliveryConfigured() {
  return process.env.EMAIL_DELIVERY_ENABLED === 'true' && Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

export function renderOrganizationEmail(subject: string, text: string) {
  const body = text.split(/\n{2,}/).map((paragraph) => `<p style="line-height:1.65;margin:0 0 16px">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
  return `<!doctype html><html><body style="margin:0;background:#f4f8fa;font-family:Calibri,Arial,sans-serif;color:#142832"><div style="max-width:640px;margin:32px auto;background:#fff;border:1px solid #d9e5ea;border-radius:18px;overflow:hidden"><div style="padding:20px 28px;background:#377f9b;color:#fff;font-weight:700;letter-spacing:.08em">PrISE 3.0</div><div style="padding:30px"><h1 style="font-size:23px;margin:0 0 20px">${escapeHtml(subject)}</h1>${body}<p style="margin:28px 0 0;color:#71858e;font-size:13px">PrISE 3.0 incubation team</p></div></div></body></html>`;
}

export async function sendDirectEmail(input: { to: string; subject: string; html: string; text: string; idempotencyKey: string }) {
  if (!emailDeliveryConfigured()) throw new Error('Email delivery is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `prise-direct-${input.idempotencyKey}`,
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      reply_to: process.env.MAIL_REPLY_TO || undefined,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Direct email delivery failed (${response.status}).`);
}

export async function sendQueuedNotification(notificationId: string) {
  if (!emailDeliveryConfigured()) throw new Error('Email delivery is disabled until Resend credentials are configured.');

  const claimed = await prisma.notification.updateMany({
    where: { id: notificationId, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } },
    data: { status: NotificationStatus.SENDING, attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count !== 1) throw new Error('Notification is not ready to send.');

  const notification = await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } });
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `prise-${notification.id}`,
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        reply_to: process.env.MAIL_REPLY_TO || undefined,
        to: [notification.recipientEmail],
        subject: notification.subject,
        html: notification.htmlBody,
        text: notification.textBody ?? undefined,
      }),
    });
    const payload = await response.json() as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message || `Resend returned ${response.status}`);
    await prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.SENT, sentAt: new Date(), providerMessageId: payload.id ?? null } });
    return payload.id ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown email error';
    await prisma.notification.update({ where: { id: notification.id }, data: { status: NotificationStatus.FAILED, lastError: message } });
    throw new Error('Email delivery failed. Review the notification outbox for details.');
  }
}

export async function sendQueuedEmailMessage(messageId: string) {
  if (!emailDeliveryConfigured()) throw new Error('Email delivery is disabled until Resend credentials are configured.');
  const claimed = await prisma.emailMessage.updateMany({
    where: { id: messageId, status: { in: [NotificationStatus.PENDING, NotificationStatus.FAILED] } },
    data: { status: NotificationStatus.SENDING, attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count !== 1) throw new Error('Email is not ready to send.');
  const message = await prisma.emailMessage.findUniqueOrThrow({ where: { id: messageId } });
  try {
    const attachment = message.attachmentStorageKey && message.attachmentName
      ? [{ filename: message.attachmentName, content: Buffer.from(await readPrivateUpload(message.attachmentStorageKey)).toString('base64') }]
      : undefined;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `prise-email-${message.id}`,
      },
      body: JSON.stringify({
        from: message.fromEmail,
        reply_to: message.replyTo || undefined,
        to: message.toEmails,
        cc: message.ccEmails.length ? message.ccEmails : undefined,
        bcc: message.bccEmails.length ? message.bccEmails : undefined,
        subject: message.subject,
        html: message.htmlBody,
        text: message.textBody,
        attachments: attachment,
      }),
      cache: 'no-store',
    });
    const payload = await response.json() as { id?: string; message?: string };
    if (!response.ok) throw new Error(payload.message || `Resend returned ${response.status}`);
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: NotificationStatus.SENT, sentAt: new Date(), providerMessageId: payload.id ?? null } });
    return payload.id ?? null;
  } catch (error) {
    const messageText = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown email error';
    await prisma.emailMessage.update({ where: { id: message.id }, data: { status: NotificationStatus.FAILED, lastError: messageText } });
    throw new Error('Email delivery failed. Review the outbox for details.');
  }
}

export async function processScheduledEmailMessages(limit = 50) {
  const messages = await prisma.emailMessage.findMany({
    where: { status: NotificationStatus.PENDING, scheduledFor: { lte: new Date() }, attempts: { lt: 3 } },
    orderBy: { scheduledFor: 'asc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: { id: true },
  });
  let sent = 0;
  let failed = 0;
  for (const message of messages) {
    try { await sendQueuedEmailMessage(message.id); sent += 1; } catch { failed += 1; }
  }
  return { considered: messages.length, sent, failed };
}
