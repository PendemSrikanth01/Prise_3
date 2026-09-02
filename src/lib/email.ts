import 'server-only';

import { NotificationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function emailDeliveryConfigured() {
  return process.env.EMAIL_DELIVERY_ENABLED === 'true' && Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
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
