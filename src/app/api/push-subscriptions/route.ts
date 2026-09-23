import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type SubscriptionInput = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function parsedSubscription(value: SubscriptionInput) {
  const endpoint = typeof value.endpoint === 'string' ? value.endpoint.trim() : '';
  const p256dh = typeof value.keys?.p256dh === 'string' ? value.keys.p256dh.trim() : '';
  const auth = typeof value.keys?.auth === 'string' ? value.keys.auth.trim() : '';
  if (!endpoint.startsWith('https://') || endpoint.length > 2048 || !p256dh || p256dh.length > 512 || !auth || auth.length > 512) return null;
  return { endpoint, p256dh, auth };
}

export async function POST(request: Request) {
  const session = await requireSession();
  const subscription = parsedSubscription(await request.json() as SubscriptionInput);
  if (!subscription) return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  await prisma.webPushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { personId: session.user.id, p256dh: subscription.p256dh, auth: subscription.auth, userAgent: request.headers.get('user-agent'), lastFailedAt: null },
    create: { personId: session.user.id, ...subscription, userAgent: request.headers.get('user-agent') },
  });
  return NextResponse.json({ subscribed: true });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  const body = await request.json() as { endpoint?: unknown };
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  await prisma.webPushSubscription.deleteMany({ where: { endpoint, personId: session.user.id } });
  return NextResponse.json({ subscribed: false });
}
