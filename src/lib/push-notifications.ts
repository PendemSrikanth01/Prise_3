import 'server-only';

import webPush from 'web-push';
import { prisma } from '@/lib/prisma';

type PushPayload = { title: string; body: string; href: string; tag: string };

function configureWebPush() {
  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webPush.setVapidDetails(process.env.PUSH_VAPID_SUBJECT || 'mailto:prise@balavikasa.org', publicKey, privateKey);
  return true;
}

function statusCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : null;
}

async function sendToSubscriptions(subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>, payload: PushPayload) {
  if (!configureWebPush() || subscriptions.length === 0) return;
  await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' });
      await prisma.webPushSubscription.update({ where: { id: subscription.id }, data: { lastFailedAt: null } });
    } catch (error) {
      const code = statusCode(error);
      if (code === 404 || code === 410) {
        await prisma.webPushSubscription.deleteMany({ where: { id: subscription.id } });
      } else {
        await prisma.webPushSubscription.updateMany({ where: { id: subscription.id }, data: { lastFailedAt: new Date() } });
        console.error('Web Push delivery failed', { subscriptionId: subscription.id, statusCode: code });
      }
    }
  }));
}

export async function deliverPushForNotificationIds(notificationIds: string[]) {
  if (!notificationIds.length || !process.env.PUSH_VAPID_PUBLIC_KEY || !process.env.PUSH_VAPID_PRIVATE_KEY) return;
  const notifications = await prisma.inAppNotification.findMany({
    where: { id: { in: notificationIds } },
    select: {
      id: true,
      title: true,
      message: true,
      href: true,
      recipient: { select: { webPushSubscriptions: { select: { id: true, endpoint: true, p256dh: true, auth: true } } } },
    },
  });
  await Promise.all(notifications.map((notification) => sendToSubscriptions(notification.recipient.webPushSubscriptions, {
    title: notification.title,
    body: notification.message,
    href: notification.href || '/',
    tag: notification.id,
  })));
}

export async function deliverPushForEventPrefix(eventPrefix: string) {
  const rows = await prisma.inAppNotification.findMany({ where: { eventKey: { startsWith: eventPrefix } }, select: { id: true } });
  await deliverPushForNotificationIds(rows.map(({ id }) => id));
}
