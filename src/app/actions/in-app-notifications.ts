'use server';

import { revalidatePath } from 'next/cache';
import { requiredText } from '@/lib/form';
import { requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function markInAppNotificationReadAction(formData: FormData) {
  const session = await requireSession();
  const notificationId = requiredText(formData, 'notificationId', 64);
  await prisma.inAppNotification.updateMany({
    where: { id: notificationId, recipientId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/', 'layout');
}

export async function markAllInAppNotificationsReadAction() {
  const session = await requireSession();
  await prisma.inAppNotification.updateMany({
    where: { recipientId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/', 'layout');
}
