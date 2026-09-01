import { NotificationStatus } from '@prisma/client';
import { cancelNotificationAction, sendNotificationAction } from '@/app/actions/mentor';
import { ConfirmButton, SubmitButton } from '@/components/ui/FormButtons';
import { emailDeliveryConfigured } from '@/lib/email';
import { requirePermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requirePermission('notification:manage');
  const [notifications, configured] = await Promise.all([
    prisma.notification.findMany({ include: { recipient: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    Promise.resolve(emailDeliveryConfigured()),
  ]);
  return <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8"><div><h1 className="text-2xl font-bold tracking-tight">Email outbox</h1><p className="mt-1.5 text-sm text-prise-text-secondary">Transactional messages are queued first, auditable, and sent only after Resend is enabled.</p></div><div className={`mt-6 rounded-card border p-4 text-sm ${configured ? 'border-success/20 bg-success-bg text-success' : 'border-warning/20 bg-warning-bg text-warning'}`}>{configured ? 'Resend delivery is enabled.' : 'Safe mode: delivery is disabled. Add RESEND_API_KEY and MAIL_FROM, then set EMAIL_DELIVERY_ENABLED=true.'}</div><div className="mt-5 overflow-hidden rounded-card border bg-white shadow-card"><div className="divide-y">{notifications.map((notification) => <div key={notification.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_230px_120px_auto] lg:items-center"><div><div className="text-sm font-semibold">{notification.subject}</div><div className="mt-1 text-xs text-prise-text-secondary">{notification.kind.replaceAll('_', ' ').toLowerCase()} · queued {notification.createdAt.toLocaleString('en-IN')}{notification.scheduledFor > new Date() ? ` · scheduled ${notification.scheduledFor.toLocaleString('en-IN')}` : ''}</div>{notification.lastError ? <div className="mt-2 text-xs text-danger">{notification.lastError}</div> : null}</div><div className="text-sm text-prise-text-secondary">{notification.recipient?.name ?? notification.recipientEmail}</div><span className="w-fit rounded-pill bg-prise-page px-2.5 py-1 text-xs font-semibold">{notification.status.toLowerCase()}</span><div className="flex gap-2">{notification.status === NotificationStatus.PENDING || notification.status === NotificationStatus.FAILED ? <><form action={sendNotificationAction}><input type="hidden" name="notificationId" value={notification.id} /><SubmitButton className="!py-2">Send</SubmitButton></form><form action={cancelNotificationAction}><input type="hidden" name="notificationId" value={notification.id} /><ConfirmButton message="Cancel this email?">Cancel</ConfirmButton></form></> : null}</div></div>)}{notifications.length === 0 ? <div className="p-12 text-center text-sm text-prise-text-secondary">The outbox is empty.</div> : null}</div></div></div>;
}
