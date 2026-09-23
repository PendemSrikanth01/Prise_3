import { DashboardShell } from '@/components/layout/DashboardShell';
import { hasPermission, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const [notifications, unreadCount] = await Promise.all([
    prisma.inAppNotification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, message: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.inAppNotification.count({ where: { recipientId: session.user.id, readAt: null } }),
  ]);
  return <DashboardShell
    user={session.user}
    canViewAudit={hasPermission(session.user.role, 'audit:view')}
    canManagePeople={hasPermission(session.user.role, 'people:manage')}
    notifications={notifications.map((item) => ({ ...item, readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() }))}
    unreadNotificationCount={unreadCount}
    pushPublicKey={process.env.PUSH_VAPID_PUBLIC_KEY || ''}
  >{children}</DashboardShell>;
}
